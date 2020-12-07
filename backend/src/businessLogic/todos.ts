import * as AWS from 'aws-sdk'
import * as uuid from 'uuid'
import { CreateTodoRequest } from '../requests/CreateTodoRequest'
import { TodoItem } from '../models/TodoItem'
import { TodoUpdate } from '../models/TodoUpdate'
import Todos from '../dataLayer/todos'
import Files from '../dataLayer/files'

const TodosAccess = new Todos()
const FilesAccess = new Files()


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
  await TodosAccess.createTodo(newTodoItem)
  return newTodoItem
}

export const getTodos = async (userId: string): Promise<AWS.DynamoDB.DocumentClient.ItemList> => {

  const items = await TodosAccess.getTodos(userId)
  for (const item of items) {
    const url = await getAttachmentsUrl(item.todoId)
    if (url) {
      item.attachmentUrl = url
    }
  }

  return items
}

export async function getSingleTodo(userId: string, todoId: string): Promise<AWS.DynamoDB.QueryOutput> {
  return await TodosAccess.getSingleTodo(userId, todoId)
}

export async function updateTodo(userId: string, todoId: string, updatedTodo: TodoUpdate): Promise<void> {
  return await TodosAccess.updateTodo(userId, todoId, updatedTodo)
}

export const deleteTodo = async (userId: string, todoId: string): Promise<void> => {
  return await TodosAccess.deleteTodo(userId, todoId)
}

export const getAttachmentsUrl = async (todoId: string): Promise<string> => {
  return await FilesAccess.getAttachmentsUrl(todoId)
}

export const getPresignedUrl = (todoId: string): string | null => {
  return FilesAccess.getPresignedUrl(todoId)
}
