import { Controller, Get, Post, Render } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('/')
  @Render('index')
  root() {
    return {
      message: 'Hi, Who are you?',
    };
  }
  @Post('/getGithubAccountInfo')
  getGithubAccountInfo() {
    return this.appService.getGithubAccountInfo();
  }
  getHello(): string {
    return this.appService.getHello();
  }
}
