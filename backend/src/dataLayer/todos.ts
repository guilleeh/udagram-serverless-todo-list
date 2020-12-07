import * as AWS from 'aws-sdk'
import * as AWSXRay from 'aws-xray-sdk'
import { DocumentClient } from 'aws-sdk/clients/dynamodb'
import { TodoItem } from '../models/TodoItem'
import { TodoUpdate } from '../models/TodoUpdate'

const XAWS = AWSXRay.captureAWS(AWS)

export default class Todos {
  constructor(
    private readonly docClient: DocumentClient = new XAWS.DynamoDB.DocumentClient(),
    private readonly todosTable = process.env.TODOS_TABLE,
    private readonly createdAtIndex = process.env.CREATED_AT_INDEX
  ) { }

  async createTodo(todoItem: TodoItem): Promise<void> {
    await this.docClient.put({
      TableName: this.todosTable,
      Item: todoItem
    }).promise()
  }

  async getTodos(userId: string): Promise<TodoItem[]> {
    const result = await this.docClient.query({
      TableName: this.todosTable,
      IndexName: this.createdAtIndex,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      }
    }).promise()

    return result.Items as TodoItem[]
  }

  async getSingleTodo(userId: string, todoId: string): Promise<AWS.DynamoDB.QueryOutput> {
    return await this.docClient.query({
      TableName: this.todosTable,
      KeyConditionExpression: 'userId = :user and todoId = :todo',
      ExpressionAttributeValues: {
        ':user': userId,
        ':todo': todoId
      }
    }).promise()
  }

  async updateTodo(userId: string, todoId: string, updatedTodo: TodoUpdate): Promise<void> {
    await this.docClient.update({
      TableName: this.todosTable,
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

  async deleteTodo(userId: string, todoId: string): Promise<void> {
    await this.docClient.delete({
      TableName: this.todosTable,
      Key: {
        userId,
        todoId
      }
    }).promise()
  }
}
