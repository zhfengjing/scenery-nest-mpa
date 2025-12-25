#!/bin/bash

# ========================================
# Database Migration Script for AWS Lambda
# ========================================
# This script invokes the migration Lambda function
# to run Prisma database migrations

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Default values
STACK_NAME="${STACK_NAME:-nestjs-app-stack}"
ACTION="${1:-deploy}"
REGION="${AWS_REGION:-us-east-1}"

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Database Migration Script${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""
echo -e "Stack Name: ${GREEN}${STACK_NAME}${NC}"
echo -e "Region: ${GREEN}${REGION}${NC}"
echo -e "Action: ${GREEN}${ACTION}${NC}"
echo ""

# Get the Migration Function Name from CloudFormation stack outputs
echo -e "${YELLOW}Getting migration function name from stack outputs...${NC}"
FUNCTION_NAME=$(aws cloudformation describe-stacks \
  --stack-name "${STACK_NAME}" \
  --region "${REGION}" \
  --query "Stacks[0].Outputs[?OutputKey=='MigrationFunctionName'].OutputValue" \
  --output text)

if [ -z "$FUNCTION_NAME" ]; then
  echo -e "${RED}Error: Could not find MigrationFunctionName in stack outputs${NC}"
  echo -e "${YELLOW}Make sure the stack '${STACK_NAME}' exists and has been deployed${NC}"
  exit 1
fi

echo -e "${GREEN}Found migration function: ${FUNCTION_NAME}${NC}"
echo ""

# Build the event payload
if [ "$ACTION" = "reset" ]; then
  echo -e "${RED}WARNING: You are about to RESET the database!${NC}"
  echo -e "${RED}This will delete all data!${NC}"
  read -p "Are you sure? Type 'yes' to continue: " CONFIRM
  if [ "$CONFIRM" != "yes" ]; then
    echo -e "${YELLOW}Operation cancelled${NC}"
    exit 0
  fi
  PAYLOAD='{"action":"reset","forceReset":true}'
elif [ "$ACTION" = "status" ]; then
  PAYLOAD='{"action":"status"}'
else
  PAYLOAD='{"action":"deploy"}'
fi

echo -e "${YELLOW}Invoking migration Lambda function...${NC}"
echo -e "Payload: ${GREEN}${PAYLOAD}${NC}"
echo ""

# Invoke the Lambda function
RESPONSE=$(aws lambda invoke \
  --function-name "${FUNCTION_NAME}" \
  --region "${REGION}" \
  --payload "${PAYLOAD}" \
  --cli-binary-format raw-in-base64-out \
  /dev/stdout 2>&1)

# Check if the invocation was successful
if [ $? -eq 0 ]; then
  echo ""
  echo -e "${GREEN}========================================${NC}"
  echo -e "${GREEN}Migration completed successfully!${NC}"
  echo -e "${GREEN}========================================${NC}"
  echo ""
  echo -e "${YELLOW}Response:${NC}"
  echo "$RESPONSE" | jq -r '.body' 2>/dev/null || echo "$RESPONSE"
  echo ""
else
  echo ""
  echo -e "${RED}========================================${NC}"
  echo -e "${RED}Migration failed!${NC}"
  echo -e "${RED}========================================${NC}"
  echo ""
  echo "$RESPONSE"
  exit 1
fi

# Show logs hint
echo ""
echo -e "${YELLOW}To view detailed logs, run:${NC}"
echo -e "aws logs tail /aws/lambda/${FUNCTION_NAME} --region ${REGION} --follow"
echo ""
