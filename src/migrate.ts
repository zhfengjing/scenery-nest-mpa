import { exec } from 'child_process';
import { promisify } from 'util';
import { Handler } from 'aws-lambda';

const execAsync = promisify(exec);

interface MigrationEvent {
  action?: 'deploy' | 'status' | 'reset';
  forceReset?: boolean;
}

interface MigrationResponse {
  statusCode: number;
  body: string;
  success: boolean;
  timestamp: string;
  action: string;
}

/**
 * Lambda Handler for Database Migration
 *
 * This function handles Prisma database migrations in AWS Lambda
 *
 * Supported actions:
 * - deploy: Apply pending migrations (default)
 * - status: Check migration status
 * - reset: Reset database (use with caution!)
 *
 * @param event - Lambda event with optional action parameter
 * @returns Migration result
 */
export const handler: Handler<MigrationEvent, MigrationResponse> = async (event) => {
  console.log('Migration Lambda triggered with event:', JSON.stringify(event, null, 2));

  const action = event.action || 'deploy';
  const timestamp = new Date().toISOString();

  try {
    // Verify DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    console.log(`Starting migration action: ${action}`);
    console.log(`Database URL configured: ${process.env.DATABASE_URL.replace(/:[^:]*@/, ':****@')}`);

    // Copy prisma.config.js to root if it exists in dist
    const fs = require('fs');
    const path = require('path');
    const configSource = '/var/task/dist/prisma.config.js';
    const configDest = '/var/task/prisma.config.js';

    if (fs.existsSync(configSource) && !fs.existsSync(configDest)) {
      console.log(`Copying prisma.config.js from ${configSource} to ${configDest}`);
      fs.copyFileSync(configSource, configDest);
    }

    let result: { stdout: string; stderr: string };
    let successMessage: string;

    switch (action) {
      case 'deploy':
        // Deploy pending migrations
        console.log('Executing: prisma migrate deploy');
        console.log('Working directory:', process.cwd());
        console.log('Checking prisma schema:', await execAsync('ls -la prisma/schema.prisma', { cwd: '/var/task' }));

        result = await execAsync('node node_modules/prisma/build/index.js migrate deploy', {
          env: {
            ...process.env,
            DATABASE_URL: process.env.DATABASE_URL,
            PATH: `${process.env.PATH}:/var/task/node_modules/.bin`,
          },
          cwd: '/var/task',
        });
        successMessage = 'Database migrations deployed successfully';
        break;

      case 'status':
        // Check migration status
        console.log('Executing: prisma migrate status');
        result = await execAsync('node node_modules/prisma/build/index.js migrate status', {
          env: {
            ...process.env,
            DATABASE_URL: process.env.DATABASE_URL,
            PATH: `${process.env.PATH}:/var/task/node_modules/.bin`,
          },
          cwd: '/var/task',
        });
        successMessage = 'Migration status retrieved successfully';
        break;

      case 'reset':
        // Reset database (dangerous operation!)
        if (!event.forceReset) {
          throw new Error('Database reset requires forceReset: true in event payload');
        }
        console.log('WARNING: Executing database reset');
        result = await execAsync('node node_modules/prisma/build/index.js migrate reset --force --skip-seed', {
          env: {
            ...process.env,
            DATABASE_URL: process.env.DATABASE_URL,
            PATH: `${process.env.PATH}:/var/task/node_modules/.bin`,
          },
          cwd: '/var/task',
        });
        successMessage = 'Database reset completed';
        break;

      default:
        throw new Error(`Unknown action: ${action}. Supported actions: deploy, status, reset`);
    }

    // Log output
    if (result.stdout) {
      console.log('STDOUT:', result.stdout);
    }
    if (result.stderr) {
      console.log('STDERR:', result.stderr);
    }

    // Prepare success response
    const response: MigrationResponse = {
      statusCode: 200,
      success: true,
      action,
      timestamp,
      body: JSON.stringify({
        message: successMessage,
        action,
        output: {
          stdout: result.stdout,
          stderr: result.stderr,
        },
        timestamp,
      }, null, 2),
    };

    console.log('Migration completed successfully');
    return response;

  } catch (error) {
    // Handle errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const errorStack = error instanceof Error ? error.stack : '';

    console.error('Migration failed:', errorMessage);
    console.error('Stack trace:', errorStack);

    const errorResponse: MigrationResponse = {
      statusCode: 500,
      success: false,
      action,
      timestamp,
      body: JSON.stringify({
        message: 'Migration failed',
        action,
        error: errorMessage,
        stack: errorStack,
        timestamp,
      }, null, 2),
    };

    return errorResponse;
  }
};
