'use strict'

const log4js = require('log4js')
const WX = require('./wx')
const fs = require('fs')

const args = process.argv.splice(2)

let key = ''

if (args.length > 0) {
  // 可附加参数授权key
  key = args[0]
}

let WxServer = 'ws://api.batorange.com/ws'
// WxServer = 'ws://127.0.0.1/ws'  //本地调试地址，请忽略

/**
* 创建日志目录
*/

try {
  require('fs').mkdirSync('./logs')
} catch (e) {
  if (e.code !== 'EEXIST') {
    console.error('Could not set up log directory, error was: ', e)
    process.exit(1)
  }
}

try {
  log4js.configure('./log4js.json')
} catch (e) {
  console.error('载入log4js日志输出配置错误: ', e)
  process.exit(1);
}

const logger = log4js.getLogger('app')

logger.info('demo start!')

const deviceInfo = {
  deviceName: '',
  deviceUuid: '',
  deviceWifiName: '',
  deviceWifiMac: '',
}

const autoData = {
  deviceData: '',
  token: ''
}

try {
  const tmpBuf = fs.readFileSync('./config.json')
  const data = JSON.parse(String(tmpBuf))
  deviceInfo.deviceName = data.deviceName
  deviceInfo.deviceUuid = data.deviceUuid
  deviceInfo.deviceWifiName = data.deviceWifiName
  deviceInfo.deviceWifiMac = data.deviceWifiMac
  autoData.deviceData = data.deviceData
  autoData.token = data.token
  logger.info('载入设备参数: ', deviceInfo, autoData)
} catch (e) {
  logger.warn('没有在本地发现设备登录参数或解析数据失败！如首次登录请忽略！')
}

const wx = new WX(WxServer)
logger.info('当前连接接口服务器为：', WxServer)

wx
  .on('open', async () => {
    let ret
    //连接后先请求授权
    ret = await wx.auth(key)
      .catch(e => {
        logger.error('授权请求失败！', e.message)
      })
    if (!ret) {
      logger.warn('授权请求未成功！', ret.msg)
      return
    }
    logger.info('授权请求成功!')

    // 非首次登录时最好使用以前成功登录时使用的设备参数，
    // 否则可能会被tx服务器怀疑账号被盗，导致手机端被登出
    ret = await wx.send('connect', deviceInfo)
      .catch(e => {
        logger.error('连接任务请求失败！', e.message)
      })
    if (!ret || !ret.success) {
      logger.warn('连接任务失败！ json:', ret)
      return
    }
    logger.info('连接任务成功, json: ', ret)


    ret = await wx.send('login', Object.assign({ loginType: 'qrcode' }, autoData))
      .catch(e => {
        logger.error('登陆请求失败！', e.message)
      })
    if (!ret || !ret.success) {
      logger.warn('登陆失败！ json:', ret)
      return
    }
    logger.info('登陆成功, json: ', ret)
  })
  .on('qrcode', data => {
    if (!data.QrCode) {
      logger.error('没有在数据中获得登陆二维码！')
      return
    }
    fs.writeFileSync('./qrcode.jpg', Buffer.from(data.QrCode || '', 'base64'))
    logger.info('登陆二维码已经写入到 ./qrcode.jpg，请打开扫码登陆！')
  })
  .on('scan', (data, msg) => {
    switch (data.Status) {
      case 0:
        logger.info('等待扫码...', data)
        break;
      case 1:
        logger.info('已扫码，请在手机端确认登陆...', data)
        break;
      case 2:
        switch (data.SubStatus) {
          case 0:
            logger.info('扫码成功！登陆成功！', data)
            break;
          case 1:
            logger.info('扫码成功！登陆失败！', data)
            break;
          default:
            logger.info('扫码成功！未知状态码！', data)
            break;
        }
        break;
      case 3:
        logger.info('二维码已过期！', data)
        break;
      case 4:
        logger.info('手机端已取消登陆！', data)
        break;
      default:
        if (msg) {
          logger.warn('scan事件返回提示信息：', msg)
        }
        break;
    }
  })
  .on('reconnect', async (data, msg) => {
    // 当触发此事件时，说明本次连接前账号已经登陆，在此事件中可以决定是否请求同步通讯录
    let ret
    logger.info('账号重连成功！')
    ret = await wx.send('syncContact')
      .catch(e => {
        logger.error('同步通讯录错误：', e.message)
      })

    if (!ret || !ret.success) {
      logger.warn('请求同步通讯录失败！ json:', ret)
    } else {
      logger.info('请求同步通讯录成功！')
    }
  })
  .on('login', async (data, msg) => {
    logger.info('微信账号登陆成功！', msg)

    let ret = await wx.send('getDeviceInfo')
      .catch(e => {
        logger.error('获取设备参数失败！', e.message)
      })
    if (!ret || !ret.success) {
      logger.warn('获取设备参数未成功！ json:', ret)
      return
    }
    logger.info('获取设备参数成功, json: ', ret)

    let tmp = Object.assign({}, ret.data)

    ret = await wx.send('getAutoLoginData')
      .catch(e => {
        logger.error('获取自动登陆数据失败！', e.message)
      })
    if (!ret || !ret.success) {
      logger.warn('获取自动登陆数据未成功！ json:', ret)
      return
    }
    logger.info('获取自动登陆数据成功, json: ', ret)
    Object.assign(tmp, { Token: ret.data.Token })
    tmp = {
      deviceName: tmp.DeviceName,
      deviceUuid: tmp.DeviceUuid,
      deviceWifiName: tmp.DeviceWifiName,
      deviceWifiMac: tmp.DeviceWifiMac,
      deviceData: tmp.DeviceData,
      token: tmp.Token,
    }

    // NOTE: 这里将设备参数保存到本地，以后再次登录此账号时提供相同参数
    fs.writeFileSync('./config.json', JSON.stringify(tmp))
    logger.info('设备参数已写入到 ./config.json文件')
  })
  .on('logout', (data, msg) => {
    logger.info('微信账号已退出！', msg)
  })
  .on('disconnect', (data, msg) => {
    logger.info('任务断线！', msg)
  })
  .on('loaded', async (data, msg) => {
    logger.info('通讯录同步完毕！', msg)

    const ret = await wx.send('sendMsg', {
      toUserName: 'filehelper',
      content: 'Hi! 你已经登陆了！'
    })
      .catch(e => {
        logger.error('发送信息错误：', e.message)
      })

    if (!ret || !ret.success) {
      logger.warn('发送信息失败！ json:', ret)
    } else {
      logger.info('发送信息成功！')
    }

  })
  .on('sns', (data, msg) => {
    logger.info('收到朋友圈事件！请查看朋友圈新消息哦！', msg)
  })
  .on('push', async data => {
    // 消息类型 data.MsgType
    // 1  微信收到文字消息的推送，一般为微信服务器发过来，我们直接转发给你们的
    // 2  好友信息推送，包含好友，群，公众号信息
    // 3  收到图片消息
    // 34  语音消息
    // 35  用户头像buf
    // 37  收到好友请求消息
    // 42  名片消息
    // 43  视频消息
    // 47  表情消息
    // 48  定位消息
    // 49  APP消息(文件 或者 链接 H5)
    // 50  语音通话
    // 51  状态通知（如打开与好友/群的聊天界面）
    // 52  语音通话通知
    // 53  语音通话邀请
    // 62  小视频
    // 2000  转账消息
    // 2001  收到红包消息
    // 3000  群邀请
    // 9999  系统通知
    // 10000  微信通知信息. 微信群信息变更通知，多为群名修改，进群，离群信息，不包含群内聊天信息
    // 10002  撤回消息
    // --------------------------------
    // 注意，如果是来自微信群的消息，data.Content字段中包含发言人的wxid及其发言内容，需要自行提取
    // 各类复杂消息，data.Content中是xml格式的文本内容，需要自行从中提取各类数据。（如好友请求）
    let ret
    switch (data.MsgType) {
      case 2:
        logger.info('收到推送联系人：', data)
        break

      case 1:
        logger.info('收到推送文本消息：', data)
        await wx.send('sendMsg', {
          toUserName: data.FromUser,
          content: '接收到你发送的内容了!\n\n原内容：' + data.Content
        })
          .then(ret => {
            logger.debug('回复信息操作结果：', ret)
          })
          .catch(e => {
            logger.error('回复信息操作错误！', e.message)
          })
        if (/^sns$/i.test(data.Content)) {
          await wx.send('snsTimeline')
            .then(ret => {
              logger.debug('执行 snsTimeline 操作结果：', ret)
            })
            .catch(e => {
              logger.error('执行 snsTimeline 操作错误！', e.message)
            })
        }
        if (/^send$/i.test(data.Content)) {
          await wx.send('snsSendMoment', {
            content: `现在时间：${new Date()}`
          })
            .then(ret => {
              logger.debug('执行 snsSendMoment 操作结果：', ret)
            })
            .catch(e => {
              logger.error('执行 snsSendMoment 操作错误！', e.message)
            })
        }
        if (/^getObj$/i.test(data.Content)) {
          await wx.send('snsGetObject', {
            momentId: '12708669896776683710'
          })
            .then(ret => {
              logger.debug('执行 snsGetObject 操作结果：', ret)
            })
            .catch(e => {
              logger.error('执行 snsGetObject 操作错误！', e.message)
            })
        }
        break

      default:
        logger.info('收到推送消息：', data)
        break
    }
  })
  .on('error', (e, isWarn) => {
    logger.error('错误事件[%s]: ', isWarn ? 'Warn' : 'error', e)
  })
  .on('other', data => {
    // 可以忽略此事件，正常情况下应该不会触发
    logger.warn('收到异常数据！', data)
  })


process.on('uncaughtException', e => {
  logger.error('Main', 'uncaughtException:', e)
})

process.on('unhandledRejection', e => {
  logger.error('Main', 'unhandledRejection:', e)
})
