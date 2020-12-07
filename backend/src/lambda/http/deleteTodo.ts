import 'source-map-support/register'

import { APIGatewayProxyEvent, APIGatewayProxyResult, APIGatewayProxyHandler } from 'aws-lambda'
import { getUserId } from '../utils'
import { getSingleTodo, deleteTodo } from '../../businessLogic/todos'
import { createLogger } from '../../utils/logger'

const logger = createLogger('deleteTodo')

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const todoId = event.pathParameters.todoId
  const userId = getUserId(event)
  const todoItem = await getSingleTodo(userId, todoId)

  if (todoItem.Count === 0) {
    logger.warn(`Cannot delete todo ${todoId} for user ${userId} as it does not exist`)
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(`Cannot delete non-existent todo`)
    }
  }

  // all good
  logger.info(`Deleting todo ${todoId} from user ${userId}`)
  await deleteTodo(userId, todoId)
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify('Todo deleted successfully!')
  }
}
