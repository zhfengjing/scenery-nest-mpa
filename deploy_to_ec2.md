<!-- 记录将此项目部署到aws ec2的要点及坑 -->
## 大概流程：浏览器访问 -> IGW -> EC2 -> RDS
### 1.使用pm2部署及启动，配置文件：ecosystem.config.js
  ```
  <!-- 部署时指定环境和配置文件 -->
  pm2 start ecosystem.config.js --env production
  ```
### 2. 配置EC2实例
   a. 配置前可先创建VPC，如不创建，可使用默认的VPC
   b. 配置安全组，安全组配置时选择子网，注意这里选择的子网所在的区域，以便后续创建数据库选择子网时要和这里的子网所在的区域相同，否则不在同一个区，跨区域访问会产生一定的费用
   c.给创建的安全组配置入站和出站规则，入站规则配置SSH（22），HTTP（80），HTTPS（443），如果是服务端渲染，需要配置浏览器访问的端口和地址；
    出站规则配置连接RDS的规则，类型：Postgresql,协议：TCP，端口：5432，选择RDS安全组ID
### 3. 创建数据库及配置数据库安全组和安全组的入站规则
    注意点：
      1. 创建数据库时，记录数据库的用户名和密码，用于后续应用连接使用，数据库名如不设置则默认为postgres
      2. 如果部署在EC2的服务连接数据库，可手动设置EC2连接的安全组，并为安全组设置入站规则，类型：Postgresql,协议：TCP，端口：5432，选择EC2实例的安全组ID
      3. EC2连接RDS时会有验证证书的默认功能，如果不想安装证书，则需要在prisma.service.ts中配置ssl:{rejectUnauthorized: false}
      4. 如果想在本地可视化操作数据库数据，可用DBeaver创建连接，如果数据库创建时设置了允许公开访问，则可以使用Host方式连接，host用数据库的长链接地址，像这样：scenery-nestjs.cluster-ck9m4acmahrf.us-east-1.rds.amazonaws.com。如果数据库没设置公开访问，只能添加SSH的访问方式连接RDS数据库。如下图：
     ![DBeaver通过SSH连接RDS的配置图](./public/static/images/dbeaver-ssh-rds-config.png);

   ```
    <img src="./public/static/images/dbeaver-ssh-rds-config.png" width="300">
   ```
      
### 4. 略