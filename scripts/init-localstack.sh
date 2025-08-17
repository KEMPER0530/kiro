#!/bin/bash

# Wait for LocalStack to be ready
echo "Waiting for LocalStack to be ready..."
sleep 10

# Create DynamoDB tables
echo "Creating DynamoDB tables..."

# Create favorites table
aws --endpoint-url=http://localhost:4566 dynamodb create-table \
    --table-name efootball-favorites \
    --attribute-definitions \
        AttributeName=userId,AttributeType=S \
        AttributeName=videoId,AttributeType=S \
    --key-schema \
        AttributeName=userId,KeyType=HASH \
        AttributeName=videoId,KeyType=RANGE \
    --provisioned-throughput \
        ReadCapacityUnits=5,WriteCapacityUnits=5 \
    --region ap-northeast-1

# Create search history table
aws --endpoint-url=http://localhost:4566 dynamodb create-table \
    --table-name efootball-search-history \
    --attribute-definitions \
        AttributeName=userId,AttributeType=S \
        AttributeName=timestamp,AttributeType=S \
    --key-schema \
        AttributeName=userId,KeyType=HASH \
        AttributeName=timestamp,KeyType=RANGE \
    --provisioned-throughput \
        ReadCapacityUnits=5,WriteCapacityUnits=5 \
    --region ap-northeast-1

echo "DynamoDB tables created successfully!"