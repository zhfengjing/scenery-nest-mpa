import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './filters/not-found.filter';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'node:path';
import dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 启用CORS
  // 启用CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });
  // 应用全局过滤器
  // app.useGlobalFilters(new NotFoundExceptionFilter());
  app.useGlobalFilters(new HttpExceptionFilter()); //这里包含了404的异常情况
  // 指定静态资源目录，这里的配置需要和nest-cli.json中的assets配置一致，这里路径配置是以dist/src作为参照配置的，静态资源会在dist/public下
  app.useStaticAssets(join(__dirname, '..', 'public'));
  // 指定视图目录，这里的配置需要和nest-cli.json中的assets配置一致，这里路径配置是以dist/src作为参照配置的，视图会在dist/views下
  app.setBaseViewsDir(join(__dirname, '..', 'views'));

  // 设置渲染引擎
  app.setViewEngine('hbs');

  const port = process.env.PORT ?? 3000;
  console.log('port=', port);
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}

bootstrap();
