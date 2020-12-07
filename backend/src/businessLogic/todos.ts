import * as AWS from 'aws-sdk'
import * as AWSXRay from 'aws-xray-sdk'
import * as uuid from 'uuid'
import { DocumentClient } from 'aws-sdk/clients/dynamodb'
import { CreateTodoRequest } from '../requests/CreateTodoRequest'
// import { config } from '../../config'
import { TodoItem } from '../models/TodoItem'
import { TodoUpdate } from '../models/TodoUpdate'
import { createLogger } from '../utils/logger'

const logger = createLogger('generateUploadUrl')



const XAWS = AWSXRay.captureAWS(AWS)

const todosTable: string = process.env.TODOS_TABLE
const createdAtIndex: string = process.env.CREATED_AT_INDEX
const docClient: DocumentClient = new XAWS.DynamoDB.DocumentClient()
const s3Client: AWS.S3 = new XAWS.S3({
  signatureVersion: 'v4'
})
const s3Bucket = process.env.FILES_S3_BUCKET
const signedUrlExpireSeconds = 60 * 5

export const createTodo = async (userId: string, createTodoRequest: CreateTodoRequest): Promise<TodoItem> => {
  const id = uuid.v4()
  const createdAt = new Date().toISOString()
  const newTodoItem: TodoItem = {
    userId,
    todoId: id,
    createdAt,
    done: false,
    ...createTodoRequest
  }

  await docClient.put({
    TableName: todosTable,
    Item: newTodoItem
  }).promise()

  return newTodoItem
}

export const getTodos = async (userId: string): Promise<AWS.DynamoDB.DocumentClient.ItemList> => {
  const result = await docClient.query({
    TableName: todosTable,
    IndexName: createdAtIndex,
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: {
      ':userId': userId
    }
  }).promise()

  const items: AWS.DynamoDB.DocumentClient.ItemList = result.Items
  for (const item of items) {
    const url = await getAttachmentsUrl(item.todoId)
    if (url) {
      item.attachmentUrl = url
    }
  }

  return items
}

export const getSingleTodo = async (userId: string, todoId: string): Promise<AWS.DynamoDB.QueryOutput> => {
  return await docClient.query({
    TableName: todosTable,
    KeyConditionExpression: 'userId = :user and todoId = :todo',
    ExpressionAttributeValues: {
      ':user': userId,
      ':todo': todoId
    }
  }).promise()
}

export const updateTodo = async (userId: string, todoId: string, updatedTodo: TodoUpdate): Promise<void> => {
  await docClient.update({
    TableName: todosTable,
    Key: {
      userId,
      todoId
    },
    UpdateExpression: 'SET #name = :n, dueDate = :due, done = :d',
    ExpressionAttributeValues: {
      ":n": updatedTodo.name,
      ":due": updatedTodo.dueDate,
      ":d": updatedTodo.done
    },
    ExpressionAttributeNames: {
      "#name": "name"
    }
  }).promise()
}

export const deleteTodo = async (userId: string, todoId: string): Promise<void> => {
  await docClient.delete({
    TableName: todosTable,
    Key: {
      userId,
      todoId
    }
  }).promise()
}

export const getAttachmentsUrl = async (todoId: string): Promise<string | null> => {
  try {
    await s3Client.headObject({
      Bucket: s3Bucket,
      Key: `${todoId}.png`
    }).promise()
    const url = s3Client.getSignedUrl('getObject', {
      Bucket: s3Bucket,
      Key: `${todoId}.png`,
      Expires: signedUrlExpireSeconds
    })
    logger.info(url)
    return url
  } catch (error) {
    logger.info(error)
    return null
  }
}

export const getPresignedUrl = (todoId: string): string => {
  return s3Client.getSignedUrl('putObject', {
    Bucket: s3Bucket,
    Key: `${todoId}.png`,
    Expires: signedUrlExpireSeconds
  })
}
