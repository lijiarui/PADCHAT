'use strict'

const WX = require('./wx')
const fs = require('fs')

const args = process.argv.splice(2)

let key = ''

if (args.length > 0) {
  // 可附加参数授权key
  key = args[0]
}

const deviceInfo = {
  deviceName: '',
  deviceUuid: '',
  deviceWifiName: '',
  deviceWifiMac: '',
}

try {
  const tmpBuf = fs.readFileSync('./config.json')
  const data = JSON.parse(String(tmpBuf))
  deviceInfo.deviceName = data.deviceName
  deviceInfo.deviceUuid = data.deviceUuid
  deviceInfo.deviceWifiName = data.deviceWifiName
  deviceInfo.deviceWifiMac = data.deviceWifiMac
  console.log('载入设备参数: ', deviceInfo)
} catch (e) {
  console.warn('没有在本地发现设备登录参数或解析数据失败！如首次登录请忽略！')
}

const wx = new WX()

wx
  .on('open', async () => {
    let ret
    //连接后先请求授权
    ret = await wx.auth(key)
      .catch(e => {
        console.error('授权请求失败！', e.message)
      })
    if (!ret) {
      console.warn('授权请求未成功！')
      return
    }
    console.log('授权请求成功!')

    // 非首次登录时最好使用以前成功登录时使用的设备参数，
    // 否则可能会被tx服务器怀疑账号被盗，导致手机端被登出
    ret = await wx.send('login', deviceInfo)
      .catch(e => {
        console.error('登录请求失败！', e.message)
      })
    if (!ret || !ret.success) {
      console.warn('请求登录未成功！ json:', ret)
      return
    }
    console.log('请求登录成功, json: ', ret)

    ret = await wx.send('getDeviceInfo')
      .catch(e => {
        console.error('获取设备参数失败！', e.message)
      })
    if (!ret || !ret.success) {
      console.warn('获取设备参数未成功！ json:', ret)
      return
    }
    console.log('获取设备参数成功, json: ', ret)
    // NOTE: 这里将设备参数保存到本地，以后再次登录此账号时提供相同参数
    deviceInfo.deviceName = ret.data.DeviceName
    deviceInfo.deviceUuid = ret.data.DeviceUuid
    deviceInfo.deviceWifiName = ret.data.DeviceWifiName
    deviceInfo.deviceWifiMac = ret.data.DeviceWifiMac
    fs.writeFileSync('./config.json', JSON.stringify(deviceInfo))
    console.log('设备参数已写入到 ./config.json文件')
  })
  .on('qrcode', data => {
    if (!data.QrCode) {
      console.error('没有在数据中获得登陆二维码！')
      return
    }
    fs.writeFileSync('./qrcode.jpg', Buffer.from(data.QrCode || '', 'base64'))
    console.log('登陆二维码已经写入到 ./qrcode.jpg，请打开扫码登陆！')
  })
  .on('scan', (data, msg) => {
    switch (data.Status) {
      case 0:
        console.log('等待扫码...')
        break;
      case 1:
        console.log('已扫码，请在手机端确认登陆...')
        break;
      case 2:
        switch (data.SubStatus) {
          case 0:
            console.log('扫码成功！登陆成功！')
            break;
          case 1:
            console.log('扫码成功！登陆失败！')
            break;
          default:
            console.log('扫码成功！子状态码:', data.SubStatus)
            break;
        }
        break;
      case 3:
        console.log('二维码已过期！')
        break;
      case 4:
        console.log('手机端已取消登陆！')
        break;
      default:
        if (msg) {
          console.warn('scan事件返回提示信息：', msg)
        }
        break;
    }
  })
  .on('reconnect', async (data, msg) => {
    // 当触发此事件时，说明本次连接前账号已经登陆，在此事件中可以决定是否请求同步通讯录
    let ret
    console.log('账号重连成功！')
    ret = await wx.send('syncContact')
      .catch(e => {
        console.error('同步通讯录错误：', e.message)
      })

    if (!ret || !ret.success) {
      console.warn('请求同步通讯录失败！ json:', ret)
    } else {
      console.log('请求同步通讯录成功！')
    }
  })
  .on('login', (data, msg) => {
    console.log('微信账号登陆成功！', msg)
  })
  .on('logout', (data, msg) => {
    console.log('微信账号已退出！', msg)
  })
  .on('loaded', (data, msg) => {
    console.log('通讯录同步完毕！', msg)
  })
  .on('sns', (data, msg) => {
    console.log('收到朋友圈事件！请查看朋友圈新消息哦！', msg)
  })
  .on('push', data => {
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
    switch (data.MsgType) {
      case 2:
        console.log('收到推送联系人：', data)
        break

      default:
        console.log('收到推送消息：', data)
        break
    }
  })
  .on('error', e => {
    console.error('错误事件：', e)
  })
  .on('other', data => {
    // 可以忽略此事件，正常情况下应该不会触发
    console.warn('收到异常数据！', data)
  })
