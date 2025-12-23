import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './filters/not-found.filter';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'node:path';
import dotenv from 'dotenv';
import serverlessExpress from '@vendia/serverless-express';
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';

dotenv.config();

let cachedServer: any;

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 启用CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // 应用全局过滤器
  app.useGlobalFilters(new HttpExceptionFilter());

  // 指定静态资源目录
  app.useStaticAssets(join(__dirname, '..', 'public'));

  // 指定视图目录
  app.setBaseViewsDir(join(__dirname, '..', 'views'));

  // 设置渲染引擎
  app.setViewEngine('hbs');

  await app.init();

  const expressApp = app.getHttpAdapter().getInstance();
  return serverlessExpress({ app: expressApp });
}

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context,
): Promise<APIGatewayProxyResult> => {
  if (!cachedServer) {
    cachedServer = await bootstrap();
  }
  return cachedServer(event, context);
};
