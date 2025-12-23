import { Injectable, HttpException } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }
  async getGithubAccountInfo(): Promise<any> {
    const res = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        'User-Agent': 'Scenery-NestJS', // 随便填一个名字
        Accept: 'application/vnd.github+json',
      },
    });
    const data = await res.json();
    console.log('github-data=', data);

    // 检查 GitHub API 响应状态
    if (!res.ok) {
      throw new HttpException(
        data.message || 'GitHub API request failed',
        res.status,
      );
    }

    return data;
  }
}
