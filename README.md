# PADCHAT

padchat 提供非web的微信接口解决方案，需要authKey 请加微信联系 `mengjunjun001`

本项目已经对所有操作进行了封装，请参考demo。

运行demo:

```bash
# npm start authKey name
# 两个参数：第一个为授权key，第二个为子账号名称（区别不同账号用，可任意设置）
npm start key test
```

与旧版本(websocket协议版本)区别:

* 新版本接口使用socket.io协议通讯
* 同一个授权key支持登陆多个子账号（依授权数量限制）
* 新版本的变量及参数名都使用小驼峰命名，包括接收到push事件（旧版本的push为大驼峰，容易混淆）
* 最大区别是新版本将所有接口都进行了封装，降低使用难度



** 以下内容为旧版websocket协议接口，仅供参考。 后续会更新socket.io版本的**





## API

API 概述如下

**接口** | **code** | **备注**
---|------|-
**登陆管理** | | 
连接认证 | auth | 调用接口身份认证
建立连接 | connect | 建立与微信服务的连接
登陆 | login | 登陆账号/恢复连接
注销登录 | logout |
断开连接 | disconnect | 仅关闭连接不退出ipad登陆
获取登陆设备参数 | getDeviceInfo |
获取二次登陆数据 | getAutoLoginData |
~登陆状态~ | ~status~ | 暂无用
**用户管理** |
获取用户信息 | getContact |
搜索用户 | searchContact |
通过好友请求 | acceptUser |
添加好友 | addContact |
打招呼 | sayHello |
删除好友 | deleteContact |
设置好友备注 | setRemark |
同步通讯录 | syncContact |
【未实现接口】获取好友、群二维码 |
**群管理** |
创建群 | createRoom |
获取群成员 | getRoomMembers |
【未实现接口】修改群名称 |
添加群成员 | addRoomMember |
邀请好友进群 | inviteRoomMember |
删除群成员 | deleteRoomMember |
退出群 | quitRoom |
**发送消息** |
发送文本消息 | sendMsg |
发送App消息 | sendAppMsg |
发送图片消息 | sendImage |
发送名片 | shareCard |
【未实现接口】上传文件 |
**获取图片、文件** |
获取消息图片原图 | getMsgImage |
【未实现接口】获取文件 |
**朋友圈操作** |
发朋友圈 |
朋友圈上传图片 |
获取好友朋友圈信息 |
获取朋友圈动态 |
获取朋友圈消息详情 |
操作朋友圈（删除、删除评论、取消赞） |
评论朋友圈 |
**收藏操作** |
同步收藏消息 |
添加收藏 |
获取收藏消息详情 |
删除收藏 |
**标签管理** |
添加标签 |
删除标签 |
获取所有标签 |
设置用户标签 |
**接收转账及红包**  |
查看转账消息 |
接受转账 |
接收红包 |
领取红包 |
查看红包信息 |
**公众号操作** |
获取公众号gh |
获取公众号信息 |
操作公众号菜单 |
获取公众号授权信息 |
获取公众号授权页面 |


## 请求结构

### 1. 服务地址

地址： ws://api.batorange.com/ws

### 2. 通信协议

WebSocket 通信协议
* [websockets 官方github](https://github.com/websockets)
* [NodeJs 参考](https://github.com/websockets/ws)

#### 连接授权

连接websocket后，需要在10秒内进行授权操作，如果未成功授权，则连接会被服务端关闭。

#### API请求操作结果（识别异步请求）

由于websocket自身是异步操作，未原生支持识别请求返回的结果（即向服务端发送一个请求，服务端返回执行结果，客户端却无法确认是自己这个主动请求的结果，或者是另一个请求的返回结果，或者是服务端主动推送）。因此本服务增加了一个字段`cmdId`，用于标识请求，并在返回操作结果时一块返回。

如果希望发送api请求后，能识别服务端执行本次请求后的返回结果，可提供`cmdId`字段，请一定提供随机值，建议使用`uuid`模块随机生成。当收到服务端推送过来的数据中包含`cmdId`字段时，即可确认为之前请求对应的执行结果。
建议结合使用`Promise`+`Event.once(cmdId)`来实现。

> `example/wx.js`已经对此进行了封装，可直接使用。

#### 数据规则约定

API请求的数据结构中，所有字段名称为`小驼峰`写法。

推送回来的数据结构中，第一级字段名称为`小驼峰`写法，`data`字段下所有字段名称为`大驼峰`写法。

### 3. API请求结构

API请求是以websocket协议发送的json数据，以下为json数据的字段

| **名称**   | **类型** | **描述**             | **必选** |
| --------- | ------   | ----------------    | ------ |
| code      | String/Number   | API命令码，见[API概览](#API)             | 是      |
| cmdId      | String   | 指令id。用于识别API异步操作结果，操作结果会增加此属性推送回来  |  否      |
| authKey      | String    | 授权码，需要购买。仅连接认证时需要             |   否    |
| data      | Object   | 取决于是不同的API要求  |  否      |

#### data字段总述

此部分为请求API指令时，需要附加的data数据。根据使用的API不同，需要提供不同的字段及对应数据。

字段名称 | 说明 | 备注
-----|----|---
**发送消息** | |
toUserName | 目标用户/群id | 群id包含@chatroom部分
content | 文本内容 | 文本消息内容<br>App消息xml结构体<br>名片自定义标题<br>添加好友时，为验证信息
image | 图片base64编码 | 发送图片消息<br>上传头像<br>朋友圈上传图片
atList | 要at的用户`数组` | `["wxid1","wxid2"]` <br>文本消息时有效
**群及好友管理** | |
roomName | 群名称
userIds | 用户id列表数组 | `["wxid1","wxid2"]` <br>创建群
groupId | 要操作的群id
remark | 备注名称
userId | 要操作的用户id | 主动添加好友<br>好友验证<br>添加/邀请用户进入群
stranger | V1码，相对加密的userId | 接受好友请求(仅限stranger字段)<br>主动添加好友(也可使用`userId`字段)
ticket | V2码，好友请求中的ticket | 添加单向好友<br>接受好友请求
type | 添加好友来源 | `1`搜索QQ号；`2`邮箱搜索；`3`微信号；<br>`4`来自QQ好友；`8`通过群聊； `15`手机号<br>默认为 微信号
**其他** | |
rawMsgData | 原始MsgData数据（即接收到的push的data字段） | 接收红包<br>接收转账<br>获取原始图片（可删除掉json中的data字段减少数据量，即缩略图base64）
**登陆设备参数** | 非必须，登陆附加数据 |不同的号要用不同的参数配置
deviceName | 设备名称 | 如:`xxxx 的 ipad`
deviceUuid | 设备UUID | 如:`AD0A82EE-98B6-498B-8CB5-E4CB664D7727`
deviceWifiName | 指定WIFI名 | 如:`WorkWifi`
deviceWifiMac | 指定WIFI MAC地址 | 如:`8E:53:A8:B3:4C:EB`

> 其中`device`系列参数用于在用户登录时指定设备参数，未指定则服务端会随机生成。
建议同一个账号长期使用同一套设备参数，短时间内多次使用不同设备参数登录，可能导致被tx服务器判断为风险环境，导致账号异常。
多个账号也不用使用同一套设备参数，否则同样可能被判断为异常登录。
此参数在首次登录后，可使用`API:获取登陆设备参数`来获取服务器随机生成的设备参数，自行进行保存，以后可以在登录时附加此套参数。


## 推送/返回数据结构

通用返回值, 推送返回的消息，包含且不仅包含下面的字段。

| **名称**   | **类型**      | **描述**                  | **必选** |
| --------- | ------        | ----------------------- | ------ |
| cmdId   | String | 指令id，用于识别API异步操作结果。仅返回API请求执行结果，且请求API时提供了cmdId时，存在               | 否     |
| success     | Boolean        | 指令执行结果                    | 否    |
| msg     | String        | 提示信息                    | Yes    |
| event   | String        | [消息事件类型](#推送数据类型)                    | Yes    |
| data   | Object/Array        | 附加数据。其下所有字段名全为大驼峰形式                    | Yes    |

### event字段

**event** | **含义** | **备注**
------|---|---
cmdRet | 指令返回结果（API请求结果） | 如果请求时提供了`cmdId`，则返回的JSON中也包含此`cmdId`字段
push | 推送信息（系统、好友消息等） | 返回的`data`字段为Array类型，需要自行拆分
qrcode | 登陆二维码 |
scan | 扫码登陆状态 |
login | **事件通知** 登陆完成 | `data`字段无附加数据
loaded | **事件通知** 通讯录同步完毕 | `data`字段无附加数据
logout | **事件通知** 注销登录 | `data`字段无附加数据
error | 错误 | 错误提示内容见`msg`字段

### data字段

| **名称**   | **类型**      | **描述**                  | **必选** |
| --------- | ------        | ----------------------- | ------ |
| MsgType   | Int           | 返回结果的类别码，详见[MsgType](#MsgType)。 | Yes    |
| Content   | String/Object | 返回内容               | No     |
| MsgId     | String        | 消息ID                    | Yes    |

### MsgType

 **值** | **描述**      | **备注**
 ------|------|---
 -1    | 异常返回，一般为长连接服务器本身发送   |
 0     | 正常的消息返回，一般为登录的微信状态的推送 |
 1     | 微信收到文字消息的推送，一般为微信服务器发过来，直接转发出去 |
 2     | 好友信息推送，包含好友，群，公众号信息   |
 3     | 收到图片消息     |
 34    | 语音消息        |
 35    | 用户头像buf     |
 37    | 收到好友请求消息 |
 42    | 名片消息        |
 47    | 表情消息        |
 48    | 定位消息        |
 49    | APP消息(文件 或者 链接 H5) |
 62    | 小视频          |
 2000  | 转账消息        |
 2001  | 收到红包消息     |
 3000  | 群邀请          |
 9999  | 系统通知    |
 10000 | 微信群信息变更通知，多为群名修改，进群，离群信息，不包含群内聊天信息，一般为微信服务器发过来，直接转发出去  |
 10002 | 撤回消息        |


## 具体接口说明

### 接口基础约定

所有的接口均遵循以下基础约定：

**请求参数**

参数字段 | 字段类型 | 说明 | 必须参数
-----|------|----|-----
code | String | 命令码 | 是
cmdId | String | 指令id，用于识别API异步操作结果 | 否
authKey | String | 授权码，需要购买。仅连接认证时需要 | 是


**返回数据**

数据字段 | 字段类型 | 说明 | 固定字段
-----|------|----|-----
type | String | 返回数据类型，访问接口操作的返回值固定为`cmdRet` | 是
cmdId | String | 指令id，用于识别API异步操作结果（与请求内一致） | 否
success | Boolean | 命令执行结果 | 是
msg | String | 提示信息 | 是
data | Object/Array | 返回的附加数据。**需要注意所有子字段名称都是大驼峰模式** | 否


### 登陆管理


#### 连接认证

命令码：`auth`

说明：与服务器建立websocket连接后，10秒内要进行认证，否则连接会被服务器断开。

如果之前已经登陆过，则此命令会将之前的连接绑定过来。

**请求参数**

参数字段 | 字段类型 | 说明 | 必须参数
-----|------|----|-----
authKey | String | 授权码，需要购买。仅连接认证时需要 | 是


**返回数据**

无额外数据字段。

数据字段 | 字段类型 | 说明 | 固定字段
-----|------|----|-----

**示例**

> 请求：

```JSON
{
  "code":"auth",
  "authKey":"0C3E8EA5-XXXX-XXXX-XXXX-A43F8C1B0CFD",
  "cmdId":"36a1d2a0-f0f8-11e7-b047-075fc026a5b1"
}
```

> 返回：

```JSON
{
  "cmdId":"36a1d2a0-f0f8-11e7-b047-075fc026a5b1",
  "success":true,
  "msg":"认证成功"
}
```


#### 建立连接

命令码：`connect`

说明：提交登陆账号请。如账号已经登陆，则会另外接收到`reconnect`事件，提示账号已经登陆。

**请求参数**

参数字段 | 字段类型 | 说明 | 必须参数
-----|------|----|-----
data.deviceName | String | 环境参数，设备名称 如:`xxxx 的 ipad` | 否
data.deviceUuid | String | 环境参数，设备UUID 如:`AD0A82EE-XXXX-XXXX-XXXX-E4CB664D7727` | 否
data.deviceWifiName | String | 环境参数，指定WIFI名 如:`WorkWifi` | 否
data.deviceWifiMac | String | 环境参数，指定WIFI MAC地址 如:`8E:53:A8:B3:4C:EB` | 否


**返回数据**

无额外数据字段。

数据字段 | 字段类型 | 说明 | 固定字段
-----|------|----|-----


**示例**

> 请求：

```JSON
{
  "code": "connect",
  "data": {
    "deviceName": "XXXXX 的 ipad",
    "deviceUuid": "D184BD80-XXXX-XXXX-XXXX-84E9066AFA42",
    "deviceWifiName": "eiXXXXXXg",
    "deviceWifiMac": "2B:D9:DD:AA:AA:3B"
  },
  "cmdId": "36a247d0-f0f8-11e7-b047-075fc026a5b1"
}

```

> 返回：

```JSON
{
  "cmdId": "36a247d0-f0f8-11e7-b047-075fc026a5b1",
  "success": true,
  "msg": null,
  "data": {
    "Ret": 0,
    "Msg": "授权验证成功，本技术只做技术交流之用，严禁使用非法用途，发现者立即封停开发者帐户!"
  },
  "type": "cmdRet"
}

```



#### 登录

命令码：`login`

说明：注销登陆。

**请求参数**

无额外数据字段。

参数字段 | 字段类型 | 说明 | 必须参数
-----|------|----|-----
loginType | String | 登陆类型(`qrcode`/`user`/`phone`) | 是
deviceData | String | 登陆设备参数（加密数据） | 否
token | String | 自动登陆数据（加密数据） | 否
~username~ | String | wx帐号密码(`user`方式) | 否
~password~ | String | wx帐号密码(`user`方式) | 否
~phone~ | String | 手机号(`phone`方式) | 否
~code~ | String | 手机验证码(`phone`方式) | 否

> 注意事项：提供`token`参数后，连接时将先尝试使用`token`进行自动登陆，失败后降级使用指定的方式进行登陆。
> `phone`方式，第一次仅提供`phone`字段，将会向手机发送验证码。第二次访问加上`code`字段，则为使用验证码进行登陆。
> **暂时不建议使用帐号密码/手机验证码登陆方式，未测试！**

**返回数据**

无额外数据字段。

数据字段 | 字段类型 | 说明 | 固定字段
-----|------|----|-----
UserName | String | 当前登陆的微信id | 是
Uin | Number | 当前登陆的微信编号（唯一） | 是


**示例**

> 请求：

```JSON
{
  "code": "login",
  "data": {
    "loginType": "qrcode",
    "deviceData": "2KEr4eH/4o54icuJqv3lm0JKVU5jqYJvpG+XSI9Af05E6UKwYHItbNCkJiPc7gInWhwntQ37pW7y+Hw8=",
    "token": "hDZkDLZzTQwLCgccdHNL3wY3wF6cpnj0Tl5peAZTqAnKLkitkHuRt/nR8aqmb2"
  },
  "cmdId": "37179ee0-f0f8-11e7-b047-075fc026a5b1"
}
```

示例数据中`deviceData`和`token`字段有删减，以实际为准。

> 返回：

```JSON
{
  "cmdId": "37179ee0-f0f8-11e7-b047-075fc026a5b1",
  "success": true,
  "msg": "自动登陆成功！",
  "data": {
    "Email": "",
    "External": "0",
    "Message": "\n\u0010Everything is ok",
    "NickName": "",
    "PhoneNumber": "",
    "Qq": 0,
    "Status": 0,
    "Uin": 149800000,
    "UserName": "wxid_xxxxxxxx"
  },
  "type": "cmdRet"
}
```


#### 注销登录

命令码：`logout`

说明：注销登陆。

**请求参数**

无额外数据字段。

参数字段 | 字段类型 | 说明 | 必须参数
-----|------|----|-----

**返回数据**

无额外数据字段。

数据字段 | 字段类型 | 说明 | 固定字段
-----|------|----|-----


**示例**

#### 断开连接

命令码：`disconnect`

说明：仅断开连接，而不退出ipad登陆状态。这样下次仍可使用自动登陆接口免验证登陆。

**请求参数**

无额外数据字段。

参数字段 | 字段类型 | 说明 | 必须参数
-----|------|----|-----

**返回数据**

无额外数据字段。

数据字段 | 字段类型 | 说明 | 固定字段
-----|------|----|-----


**示例**




#### 获取登陆设备参数

命令码：`getDeviceInfo`

说明：登陆时，服务端会随机生成设备参数。此指令会获取服务端的登陆设备参数，可自行保存，在登陆时附加此套设备参数。

> **强烈建议**同一个账号长期使用同一套设备参数，短时间内多次使用不同设备参数登录，容易被tx服务器判断为**风险环境**，导致账号异常。
多个账号**绝对不要**使用同一套设备参数，否则有**非常高的几率**被判断为异常登录。

**请求参数**

无额外数据字段。

参数字段 | 字段类型 | 说明 | 必须参数
-----|------|----|-----


**返回数据**

数据字段 | 字段类型 | 说明 | 固定字段
-----|------|----|-----
data.DeviceName | String | 环境参数，设备名称 如:`xxxx 的 ipad` | 否
data.DeviceUuid | String | 环境参数，设备UUID 如:`AD0A82EE-98B6-498B-8CB5-E4CB664D7727` | 否
data.DeviceWifiName | String | 环境参数，指定WIFI名 如:`WorkWifi` | 否
data.DeviceWifiMac | String | 环境参数，指定WIFI MAC地址 如:`8E:53:A8:B3:4C:EB` | 否
data.DeviceData | String | 经过加密的设备信息（62数据） | 否

> 使用`DeviceData`即可忽略其他设备参数，不要账号间混用！

**示例**

#### 获取二次登陆数据

命令码：`getAutoLoginData`

说明：登陆后，获取二次登陆数据。之后可以使用这个数据快速自动登陆，免除手动扫码/验证码登陆。

> 这个数据是有有效期的，建议定期更新一次（如1小时）。如果你和服务器间连接稳定，长时间不更新应该也可以。后续待观察

**请求参数**

无额外数据字段。

参数字段 | 字段类型 | 说明 | 必须参数
-----|------|----|-----


**返回数据**

数据字段 | 字段类型 | 说明 | 固定字段
-----|------|----|-----
data.Token | String | 加密的token数据，用于免验证自动登陆（需配合设备参数，建议和`DeviceData`一起使用） | 否


**示例**



#### 登陆状态

命令码：`status`

说明：获取登陆状态。**暂未使用**

**请求参数**


**返回数据**


**示例**




### 用户管理


#### 获取用户信息

命令码：`getContact`

说明：获取用户信息

**请求参数**

参数字段 | 字段类型 | 说明 | 必须参数
-----|------|----|-----
data.userId | String | 用户wxid | 是

**返回数据**

数据字段 | 字段类型 | 说明 | 固定字段
-----|------|----|-----
data.BigHead | String | 大头像url | 是
data.City | String | 城市英文名 | 是
data.Country | String | 国家英文名 | 是
data.Intro | String | 简介（公众号所属公司名称） | 是
data.Label | String | 标签 | 是
data.Message | String | 微信端命令执行结果提示信息，忽略 | 是
data.NickName | String | 昵称 | 是
data.Provincia | String | 省份英文名 | 是
data.PyInitial | String | 昵称拼音简写 | 是
data.QuanPin | String | 昵称全拼 | 是
data.Remark | String | 备注名称 | 是
data.RemarkPyInitial | String | 备注拼音简写 | 是
data.RemarkQuanPin | String | 备注全拼 | 是
data.Sex | Number | 性别：1男；2女 | 是
data.Signature | String | 个人签名 | 是
data.SmallHead | String | 小头像url | 是
data.Status | Number | 微信端命令执行结果，成功为`0`，忽略 | 是
data.Stranger | String | 用户V1码，用于添加好友或通过好友请求 | 是
data.Ticket | String | 用户V2码，用于添加好友或通过好友请求 | 是
data.UserName | String | 用户wxid/微信群wxid/公众号gh_id | 是

**示例**




#### 搜索用户

命令码：`searchContact`

说明：搜索用户信息

**请求参数**

参数字段 | 字段类型 | 说明 | 必须参数
-----|------|----|-----
data.userId | String | 用户wxid | 是

**返回数据**

数据字段 | 字段类型 | 说明 | 固定字段
-----|------|----|-----
data.BigHead | String | 大头像url | 是
data.City | String | 城市英文名 | 是
data.Country | String | 国家英文名 | 是
data.Message | String | 微信端命令执行结果提示信息，忽略 | 是
data.NickName | String | 昵称 | 是
data.Provincia | String | 省份英文名 | 是
data.PyInitial | String | 昵称拼音简写 | 是
data.QuanPin | String | 昵称全拼 | 是
data.Sex | Number | 性别：1男；2女 | 是
data.Signature | String | 个人签名 | 是
data.SmallHead | String | 小头像url | 是
data.Status | Number | 微信端命令执行结果，成功为`0`，忽略 | 是
data.Stranger | String | 用户V1码，用于添加好友或通过好友请求 TODO:需要确认 | 是
data.UserName | String | 用户wxid/微信群wxid/公众号gh_id TODO:需要确认 | 是


**示例**




#### 通过好友请求

命令码：`acceptUser`

说明：通过好友请求。参数需自行推送的好友请求信息中提取

**请求参数**

参数字段 | 字段类型 | 说明 | 必须参数
-----|------|----|-----
data.stranger | String | 用户V1码 | 是
data.ticket | String | 用户V2码 | 是


**返回数据**

数据字段 | 字段类型 | 说明 | 固定字段
-----|------|----|-----
data.Message | String | 微信端命令执行结果提示信息，忽略 | 是
data.Status | Number | 微信端命令执行结果，成功为`0`，忽略 | 是

**示例**




#### 添加好友

命令码：`addContact`

说明：主动添加好友（可添加单向好友）

**请求参数**

参数字段 | 字段类型 | 说明 | 必须参数
-----|------|----|-----
data.userId | String | 用户wxid | 是 (userId/stranger 任选其一)
data.stranger | String | 用户V1码 | 是 (userId/stranger 任选其一)
data.ticket | String | 用户V2码（提供则添加单向好友） | 否
data.type | Numver | 添加好友来源:<br>`1`搜索QQ号；`2`邮箱搜索；`3`微信号；<br>`4`来自QQ好友；`8`通过群聊； `15`手机号<br>默认为 微信号 | 否
data.content | String | 好友请求说明 | 是

**返回数据**

数据字段 | 字段类型 | 说明 | 固定字段
-----|------|----|-----
data.Message | String | 微信端命令执行结果提示信息，忽略 | 是
data.Status | Number | 微信端命令执行结果，成功为`0`，忽略 | 是


**示例**




#### 打招呼

命令码：`sayHello`

说明：

**请求参数**

参数字段 | 字段类型 | 说明 | 必须参数
-----|------|----|-----
data.userId | String | 用户wxid | 是 (userId/stranger 任选其一)
data.stranger | String | 用户V1码 | 是 (userId/stranger 任选其一)
data.ticket | String | 用户V2码（提供则添加单向好友） | 否
data.content | String | 好友请求说明 | 是

**返回数据**

数据字段 | 字段类型 | 说明 | 固定字段
-----|------|----|-----
data.Message | String | 微信端命令执行结果提示信息，忽略 | 是
data.Status | Number | 微信端命令执行结果，成功为`0`，忽略 | 是



**示例**




#### 删除好友

命令码：`deleteContact`

说明：删除好友

**请求参数**

参数字段 | 字段类型 | 说明 | 必须参数
-----|------|----|-----
data.userId | String | 用户wxid | 是


**返回数据**

数据字段 | 字段类型 | 说明 | 固定字段
-----|------|----|-----
data.Message | String | 微信端命令执行结果提示信息，忽略 | 是
data.Status | Number | 微信端命令执行结果，成功为`0`，忽略 | 是

**示例**




#### 设置好友备注

命令码：`setRemark`

说明：为好友设置备注

**请求参数**

参数字段 | 字段类型 | 说明 | 必须参数
-----|------|----|-----
data.userId | String | 用户wxid | 是
data.remark | String | 备注名称 | 是


**返回数据**

数据字段 | 字段类型 | 说明 | 固定字段
-----|------|----|-----
data.Message | String | 微信端命令执行结果提示信息，忽略 | 是
data.Status | Number | 微信端命令执行结果，成功为`0`，忽略 | 是

**示例**




#### 同步通讯录

命令码：`syncContact`

说明：同步通讯录

**请求参数**

无额外数据字段。

参数字段 | 字段类型 | 说明 | 必须参数
-----|------|----|-----

**返回数据**

无额外数据字段。

数据字段 | 字段类型 | 说明 | 固定字段
-----|------|----|-----


**示例**



### 群管理


#### 创建群

命令码：`createRoom`

说明：创建微信群

**请求参数**

参数字段 | 字段类型 | 说明 | 必须参数
-----|------|----|-----
data.userIds | Array<String> | 用户wxid数组，至少需要有2个好友wxid | 是


**返回数据**

数据字段 | 字段类型 | 说明 | 固定字段
-----|------|----|-----
data.Message | String | 微信端命令执行结果提示信息，忽略 | 是
data.Status | Number | 微信端命令执行结果，成功为`0`，忽略 | 是
data.UserName | String | 建立的微信群id | 是


**示例**




#### 获取群成员

命令码：`getRoomMembers`

说明：获取微信群成员信息

**请求参数**

参数字段 | 字段类型 | 说明 | 必须参数
-----|------|----|-----
data.groupId | String | 微信群id | 是


**返回数据**

数据字段 | 字段类型 | 说明 | 固定字段
-----|------|----|-----
data.Message | String | 微信端命令执行结果提示信息，忽略 | 是
data.Status | Number | 微信端命令执行结果，成功为`0`，忽略 | 是
data.UserName | String | 微信群id | 是
data.ChatroomId | Number | 未知字段 | 是
data.Count | Number | 微信群成员数量 | 是
data.UserName | String | 建立的微信群id | 是
data.Member | String | 微信群成员信息数组文本 | 是

data.Member字段需要进行从字符串解析为数组：

数据字段 | 字段类型 | 说明 | 固定字段
-----|------|----|-----
BigHead | String | 用户大头像url | 是
ChatroomNickName | String | 用户群内独立昵称 | 是
InvitedBy | String | 邀请此用户进群的用户wxid | 是
NickName | String | 用户昵称 | 是
SmallHead | String | 用户小头像url | 是
UserName | String | 用户wxid | 是


**示例**



#### 添加群成员

命令码：`addRoomMember`

说明：将好友添加到群内

**请求参数**

参数字段 | 字段类型 | 说明 | 必须参数
-----|------|----|-----
data.groupId | String | 微信群id | 是
data.userId | String | 用户wxid | 是


**返回数据**

数据字段 | 字段类型 | 说明 | 固定字段
-----|------|----|-----
data.Message | String | 微信端命令执行结果提示信息，忽略 | 是
data.Status | Number | 微信端命令执行结果，成功为`0`，忽略 | 是


**示例**




#### 邀请好友进群

命令码：`inviteRoomMember`

说明：邀请好友进群（好友收到你发出的进群邀请消息）

**请求参数**

参数字段 | 字段类型 | 说明 | 必须参数
-----|------|----|-----
data.groupId | String | 微信群id | 是
data.userId | String | 用户wxid | 是


**返回数据**

数据字段 | 字段类型 | 说明 | 固定字段
-----|------|----|-----
data.Message | String | 微信端命令执行结果提示信息，忽略 | 是
data.Status | Number | 微信端命令执行结果，成功为`0`，忽略 | 是


**示例**




#### 删除群成员

命令码：`deleteRoomMember`

说明：删除微信群成员

**请求参数**

参数字段 | 字段类型 | 说明 | 必须参数
-----|------|----|-----
data.groupId | String | 微信群id | 是
data.userId | String | 用户wxid | 是


**返回数据**

数据字段 | 字段类型 | 说明 | 固定字段
-----|------|----|-----
data.Message | String | 微信端命令执行结果提示信息，忽略 | 是
data.Status | Number | 微信端命令执行结果，成功为`0`，忽略 | 是


**示例**




#### 退出群

命令码：`quitRoom`

说明：主动退出指定微信群

**请求参数**

参数字段 | 字段类型 | 说明 | 必须参数
-----|------|----|-----
data.groupId | String | 微信群id | 是


**返回数据**

数据字段 | 字段类型 | 说明 | 固定字段
-----|------|----|-----
data.Message | String | 微信端命令执行结果提示信息，忽略 | 是
data.Status | Number | 微信端命令执行结果，成功为`0`，忽略 | 是


**示例**




### 发送消息


#### 发送文本消息

命令码：`sendMsg`

说明：发送文本消息

**请求参数**

参数字段 | 字段类型 | 说明 | 必须参数
-----|------|----|-----
data.toUserName | String | 目标用户wxid/微信群id | 是
data.content | String | 文本内容 | 是
data.atList | Array<String> | 要在群内at的用户wxid数组 | 否


**返回数据**

数据字段 | 字段类型 | 说明 | 固定字段
-----|------|----|-----
data.Message | String | 微信端命令执行结果提示信息，忽略 | 是
data.Status | Number | 微信端命令执行结果，成功为`0`，忽略 | 是
data.MsgId | String | 发送出的消息id | 是


**示例**




#### 发送App消息

命令码：`sendAppMsg`

说明：发送App消息

**请求参数**

参数字段 | 字段类型 | 说明 | 必须参数
-----|------|----|-----
data.toUserName | String | 目标用户wxid/微信群id | 是
data.content | String | app消息xml结构体文本（`<appmsg></appmsg>`部分） | 是

> **app消息xml结构体文本：**
```xml
<appmsg appid="" sdkver="">
    <title>消息标题</title>
    <des>描述内容</des>
    <action>view</action>
    <type>5</type>
    <showtype>0</showtype>
    <content></content>
    <url>指向url</url>
    <thumburl>缩略图url</thumburl>
    <lowurl></lowurl>
    <appattach>
        <totallen>0</totallen>
        <attachid></attachid>
        <fileext></fileext>
    </appattach>
    <extinfo></extinfo>
</appmsg>
```
> 其中`type`为`5`是链接，`6`是文件，`33`是小程序（目前不支持发送小程序）。


**返回数据**

数据字段 | 字段类型 | 说明 | 固定字段
-----|------|----|-----
data.Message | String | 微信端命令执行结果提示信息，忽略 | 是
data.Status | Number | 微信端命令执行结果，成功为`0`，忽略 | 是
data.MsgId | String | 发送出的消息id | 是


**示例**




#### 发送图片消息

命令码：`sendImage`

说明：发送图片

**请求参数**

参数字段 | 字段类型 | 说明 | 必须参数
-----|------|----|-----
data.toUserName | String | 目标用户wxid/微信群id | 是
data.image | String | 图片base64编码 | 是


**返回数据**

数据字段 | 字段类型 | 说明 | 固定字段
-----|------|----|-----
data.Message | String | 微信端命令执行结果提示信息，忽略 | 是
data.Status | Number | 微信端命令执行结果，成功为`0`，忽略 | 是
data.MsgId | String | 发送出的消息id | 是


**示例**




#### 发送名片

命令码：`shareCard`

说明：分享用户名片

**请求参数**

参数字段 | 字段类型 | 说明 | 必须参数
-----|------|----|-----
data.toUserName | String | 目标用户wxid/微信群id | 是
data.userId | String | 分享的用户wxid | 是
data.content | String | 自定义分享标题 | 是


**返回数据**

数据字段 | 字段类型 | 说明 | 固定字段
-----|------|----|-----
data.Message | String | 微信端命令执行结果提示信息，忽略 | 是
data.Status | Number | 微信端命令执行结果，成功为`0`，忽略 | 是
data.MsgId | String | 发送出的消息id | 是


**示例**



### 获取图片、文件


#### 获取消息图片原图

命令码：`getMsgImage`

说明：

**请求参数**

参数字段 | 字段类型 | 说明 | 必须参数
-----|------|----|-----
data.rawMsgData | Object | 接收到的图片消息数据结构 | 是
data.rawMsgData.Content | String | 接收到消息中`data`下对应字段 | 是
data.rawMsgData.FromUser | String | 接收到消息中`data`下对应字段 | 是
data.rawMsgData.MsgId | String | 接收到消息中`data`下对应字段 | 是
data.rawMsgData.ToUser | String | 接收到消息中`data`下对应字段 | 是
data.rawMsgData.Uin | Number | 接收到消息中`data`下对应字段 | 是


**返回数据**

数据字段 | 字段类型 | 说明 | 固定字段
-----|------|----|-----
data.Message | String | 微信端命令执行结果提示信息，忽略 | 是
data.Status | Number | 微信端命令执行结果，成功为`0`，忽略 | 是
data.Image | String | 原始图片base64编码 | 是
data.Size | Number | 图片原始尺寸 | 是


**示例**


## 推送数据说明

TODO: 以下待编辑