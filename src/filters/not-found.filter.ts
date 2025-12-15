import {
  ExceptionFilter,
  Catch,
  NotFoundException,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response, Request } from 'express';

// @Catch(NotFoundException) 只捕获 404 错误
// 如果你想捕获所有 HTTP 错误并自定义页面，可以用 @Catch(HttpException)
@Catch(NotFoundException)
export class NotFoundExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    // console.log('host:', host);
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    // console.log('ctx:', ctx);
    console.log('status:', status);

    // 渲染名为404 的视图模板
    response.status(status).render('404', {
      title: '页面未找到',
      path: request.url,
    });
  }
}

// @Catch(HttpException) 捕获所有 HTTP 类型的异常
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    // 1. 定一个默认状态码
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    // 定义默认的错误提示 (始终为字符串，避免 unsafe any 的赋值)
    let message: string = 'Internal Server Error';
    // console.log('ctx:', ctx);
    console.log('HttpExceptionFilter-status:', status);
    // 判断异常类型，请求类型的错误和代码错误类型
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse() as
        | string
        | { message?: string | string[] };
      console.log('exceptionResponse:', exceptionResponse);
      // 2. 获取错误信息 (NestJS 的异常响应有时是字符串，有时是对象)
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null &&
        'message' in exceptionResponse &&
        exceptionResponse.message !== undefined
      ) {
        // 这里的 message 可能是字符串，也可能是数组（class-validator 校验错误时是数组）
        const msg = exceptionResponse.message;
        if (Array.isArray(msg)) {
          message = msg.join('; ');
        } else if (typeof msg === 'string') {
          message = msg;
        } else {
          // 若 message 不是字符串或数组，则安全地转换为字符串
          message = String(msg);
        }
      }
    } else if (exception instanceof Error) {
      // 如果是原生 JS 错误 (如 TypeError, ReferenceError)
      // 在生产环境中，为了安全通常不把具体堆栈展示给用户，这里为了演示保留 message
      message = exception.message;
    }

    // 通常通过 URL 前缀 (如 /api/) 或 Accept 头来判断
    // 这里简单演示：如果 URL 不包含 /api/ 且 Accept 头包含 html，则渲染页面
    const isApiRequest =
      request.url.startsWith('/api/') ||
      !request.headers.accept?.includes('text/html');
    console.log('isApiReq:', isApiRequest);
    if (isApiRequest) {
      // --- 情况 A: 返回 JSON (给前端接口用) ---
      response.status(status).json({
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
        message: message,
      });
    } else {
      // --- 情况 B: 渲染 HTML (给用户看) ---
      // 你可以准备一个通用的 error.hbs 模板
      const is404 = status === HttpStatus.NOT_FOUND;
      response.status(status).render(is404 ? '404' : 'error', {
        statusCode: status,
        message: message,
        path: request.url,
        // 可以根据状态码显示不同标题
        title: is404 ? '页面未找到' : '系统发生错误',
      });
    }
  }
}
