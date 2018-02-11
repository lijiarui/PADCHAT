'use strict'

const EventEmitter = require('events')
const Io = require('socket.io-client')


const loginType = {
  token: 'token',
  qrcode: 'qrcode',
  // phone: 'phone',
  // user: 'user',
}

const server = 'http://127.0.0.1:7001/user'

/**
 * Padchat模块
 *
 * 使用socket.io与服务器进行通讯，拥有以下事件:
 *
 * qrcode 推送的二维码
 * scan 扫码状态
 * push 新信息事件
 * login 登录
 * loaded 通讯录载入完毕
 * logout 注销登录
 * close 任务实例关闭（要再登录需要重新调用init）
 * warn 错误信息
 * sns 朋友圈更新事件
 *
 * 另有socket.io的事件，请参阅socket.io文档:
 * connect
 * connect
 * connect_error
 * connect_timeout
 * error
 * disconnect
 * reconnect
 * reconnect_attempt
 * reconnecting
 * reconnect_error
 * reconnect_failed
 * ping
 *
 * 所有接口均返回以下结构数据：
 * {
 *   success: true, // 执行是否成功
 *   msg: '', // 错误提示
 *   data: {} // 返回结果
 * }
 *
 * @class Padchat
 * @extends {EventEmitter}
 */
class Padchat extends EventEmitter {
  /**
   * Creates an instance of Padchat.
   * @param {string} key 授权key
   * @param {string} name 实例名称
   * @param {object} [opts={}] 附加参数
   * url 服务器url
   * debug 开启调试模式
   * qurey 连接服务器时附加参数
   * transports 与服务器通讯模式，不建议更改
   * sendTimeout 操作的超时时间，单位为秒
   * @memberof Padchat
   */
  constructor(key, name, opts = {}) {
    super()
    const {
      url = server,
      debug = false,
      query,
      transports = ['websocket', 'polling'],
      sendTimeout = 60,
    } = opts

    this.sendTimeout = sendTimeout
    this.io = Io(url, {
      query: Object.assign({
        authKey: key,
        name: name || 0,
      }, query),
      transports,
    })

    this.debug = typeof debug === 'function' ? debug : (...args) => { }
    onEvent.call(this)
  }


  async sendCmd(cmd, data = {}, cb) {
    const socketEvents = [
      'error',
      'connect',
      'disconnect',
      'disconnecting',
      'newListener',
      'removeListener',
      'ping',
      'pong',
    ]
    if (socketEvents.includes(cmd)) {
      throw new Error('Cmd name Error!')
    }
    const sendTimeout = this.sendTimeout
    if (!this.io.connected) {
      throw new Error('Not connected!')
    }
    if (data.rawMsg) {
      data.rawMsg = clearRawMsg(data.rawMsg)
    }
    if (cb && typeof cb === 'function') {
      this.io.emit(cmd, data, cb)
      return
    }
    return new Promise((res, rej) => {
      // 如果某操作超过指定时间没有返回结果，则认为是操作超时
      const timeOutHandle = setTimeout(() => {
        rej(new Error('等待操作结果超时！'))
      }, sendTimeout * 1000)
      this.io.emit(cmd, data, (...args) => {
        clearTimeout(timeOutHandle)
        res.apply(null, args)
      })
    })
  }

  /**
   * 初始化
   *
   * @param {Object} data 设备参数。
   * 每个账号最好使用同一套参数，同一套参数不要多个账号用！
   * deviceName 设备名称
   * deviceUuid 设备uuid
   * deviceWifiName 设备wifi名称
   * deviceWifiMac 设备wifi mac地址
   * deviceData 【非必须】设备加密数据，登录后使用 getDeviceInfo接口获得
   *
   * @returns {Promise} 返回Promise<Object>，注意捕捉catch
   * @memberof Padchat
   */
  async init(data) {
    const { deviceName, deviceUuid, deviceWifiName, deviceWifiMac, deviceData } = data
    if (!deviceName || !deviceUuid || !deviceWifiName || !deviceWifiMac) {
      throw new Error('参数错误！')
    }
    return await this.sendCmd('init', {
      deviceName, deviceUuid, deviceWifiName,
      deviceWifiMac, deviceData,
    })
  }

  /**
   * 关闭登录实例
   *
   * @returns {Promise} 返回Promise<Object>，注意捕捉catch
   * @memberof Padchat
   */
  async close() {
    return await this.sendCmd('close')
  }

  /**
   * 登录账号
   *
   * @param {string} [type='qrcode'] 登录类型，默认为扫码登录
   * token 使用token自动登录
   * qrcode 扫码登录
   * phone 使用手机验证码登录
   * user 使用账号+密码登录
   * @param {Object} data 附加数据
   * 登录类型 | 字段 | 说明
   * ----|----|----
   * token | token | 使用用任意方式登录成功后，使用 getAutoLogin 接口获得。 此token有过期时间，断开登录状态一段时间后会过期。
   * phone | phone | 手机号
   * phone | code | 手机验证码
   * user | username | 用户名/qq号/手机号
   * user | password | 密码
   * @returns {Promise} 返回Promise<Object>，注意捕捉catch
   * @memberof Padchat
   */
  async login(type = 'qrcode', data = {}) {
    if (!loginType[type]) {
      throw new Error('login type error!')
    }

    switch (type) {
      case 'token':
        if (!data.token) {
          throw new Error('login data error!')
        }
        break;
      case 'phone':
        if (!data.phone) { // code
          throw new Error('login data error!')
        }
        break;
      case 'user':
        if (!data.username || !data.password) {
          throw new Error('login data error!')
        }
        break;
      default:
        break;
    }
    data.loginType = loginType[type]
    return await this.sendCmd('login', data)
  }


  /**
   * 获取设备参数（含加密的62数据）
   *
   * @returns {Promise} 返回Promise<Object>，注意捕捉catch
   * @memberof Padchat
   */
  async getDeviceInfo() {
    return await this.sendCmd('getDeviceInfo', {})
  }

  /**
   * 获取二次登陆数据
   *
   * @returns {Promise} 返回Promise<Object>，注意捕捉catch
   * @memberof Padchat
   */
  async getAutoLogin() {
    return await this.sendCmd('getAutoLogin', {})
  }

  /**
   * 同步通讯录
   *
   * @returns {Promise} 返回Promise<Object>，注意捕捉catch
   * @memberof Padchat
   */
  async syncContact() {
    return await this.sendCmd('syncContact', {})
  }

  /**
   * 退出登录
   *
   * @returns {Promise} 返回Promise<Object>，注意捕捉catch
   * @memberof Padchat
   */
  async logout() {
    return await this.sendCmd('logout', {
    })
  }

  /**
   * 发送文字信息
   *
   * @param {String} toUserName 接收者的wxid
   * @param {String} content 内容文本
   * @param {any} [atList=[]] 向群内发信息时，要@的用户wxid数组
   * @returns {Promise} 返回Promise<Object>，注意捕捉catch
   * @memberof Padchat
   */
  async sendMsg(toUserName, content, atList = []) {
    return await this.sendCmd('sendMsg', {
      toUserName,
      content,
      atList,
    })
  }

  /**
   * 发送App消息
   *
   * @param {String} toUserName 接收者的wxid
   * @param {String} content 内容文本
   * @returns {Promise} 返回Promise<Object>，注意捕捉catch
   * @memberof Padchat
   */
  async sendAppMsg(toUserName, content) {
    return await this.sendCmd('sendAppMsg', {
      toUserName, content,
    })
  }

  /**
   * 分享名片
   *
   * @param {String} toUserName 接收者的wxid
   * @param {String} content 内容文本
   * @param {String} userId 被分享人wxid
   * @returns {Promise} 返回Promise<Object>，注意捕捉catch
   * @memberof Padchat
   */
  async shareCard(toUserName, content, userId) {
    return await this.sendCmd('shareCard', {
      toUserName, content, userId,
    })
  }

  /**
   * 发送图片消息
   *
   * @param {String} toUserName 接收者的wxid
   * @param {Buffer|String} image 图片Buffer数据或base64
   * @returns {Promise} 返回Promise<Object>，注意捕捉catch
   * @memberof Padchat
   */
  async sendImage(toUserName, image) {
    if (image instanceof Buffer) {
      image = image.toString('base64')
    }
    return await this.sendCmd('sendImage', {
      toUserName, image,
    })
  }

  /**
   * 创建群
   *
   * @param {String[]} userList 用户wxid数组
   * @returns {Promise} 返回Promise<Object>，注意捕捉catch
   * @memberof Padchat
   */
  async createRoom(userList) {
    return await this.sendCmd('createRoom', {
      userList,
    })
  }

  /**
   * 获取群成员信息
   *
   * @param {String} groupId 群id
   * @returns {Promise} 返回Promise<Object>，注意捕捉catch
   * @memberof Padchat
   */
  async getRoomMembers(groupId) {
    return await this.sendCmd('getRoomMembers', {
      groupId,
    })
  }

  /**
   * 添加群成员
   *
   * @param {String} groupId 群id
   * @param {String} userId 用户wxid
   * @returns {Promise} 返回Promise<Object>，注意捕捉catch
   * @memberof Padchat
   */
  async addRoomMember(groupId, userId) {
    return await this.sendCmd('addRoomMember', {
      groupId, userId,
    })
  }

  /**
   * 邀请群成员
   *
   * @param {String} groupId 群id
   * @param {String} userId 用户wxid
   * @returns {Promise} 返回Promise<Object>，注意捕捉catch
   * @memberof Padchat
   */
  async inviteRoomMember(groupId, userId) {
    return await this.sendCmd('inviteRoomMember', {
      groupId, userId,
    })
  }

  /**
   * 删除群成员
   *
   * @param {String} groupId 群id
   * @param {String} userId 用户wxid
   * @returns {Promise} 返回Promise<Object>，注意捕捉catch
   * @memberof Padchat
   */
  async deleteRoomMember(groupId, userId) {
    return await this.sendCmd('deleteRoomMember', {
      groupId, userId,
    })
  }

  /**
   * 退出群
   *
   * @param {String} groupId 群id
   * @returns {Promise} 返回Promise<Object>，注意捕捉catch
   * @memberof Padchat
   */
  async quitRoom(groupId) {
    return await this.sendCmd('quitRoom', {
      groupId,
    })
  }

  /**
   * 获取用户信息
   *
   * @param {String} userId 用户wxid
   * @returns {Promise} 返回Promise<Object>，注意捕捉catch
   * @memberof Padchat
   */
  async getContact(userId) {
    return await this.sendCmd('getContact', {
      userId,
    })
  }

  /**
   * 搜索用户
   *
   * @param {String} userId 用户wxid
   * @returns {Promise} 返回Promise<Object>，注意捕捉catch
   * @memberof Padchat
   */
  async searchContact(userId) {
    return await this.sendCmd('searchContact', {
      userId,
    })
  }

  /**
   * 删除好友
   *
   * @param {String} userId 用户wxid
   * @returns {Promise} 返回Promise<Object>，注意捕捉catch
   * @memberof Padchat
   */
  async deleteContact(userId) {
    return await this.sendCmd('deleteContact', {
      userId,
    })
  }

  /**
   * 通过好友验证
   *
   * @param {String} stranger 用户stranger数据
   * @param {String} ticket 用户ticket数据
   * @returns {Promise} 返回Promise<Object>，注意捕捉catch
   * @memberof Padchat
   */
  async acceptUser(stranger, ticket) {
    return await this.sendCmd('acceptUser', {
      stranger,
      ticket,
    })
  }

  /**
   * 添加好友
   *
   * @param {String} stranger 用户stranger数据
   * @param {String} ticket 用户ticket数据
   * @param {Number} type 添加好友途径
   × 值 | 说明
   × ----|----
   × 1 | 朋友验证方式
   × 2 | 通过搜索邮箱
   × 3 | 通过微信号搜索
   × 4 | 通过QQ好友添加
   × 5 | 通过朋友验证消息
   × 7 | 通过朋友验证消息(可回复)
   × 8 | 通过群来源
   × 12 | 通过QQ好友添加
   × 14 | 通过群来源
   × 15 | 通过搜索手机号
   × 16 | 通过朋友验证消息
   × 17 | 通过名片分享
   × 22 | 通过摇一摇打招呼方式
   × 25 | 通过漂流瓶
   × 30 | 通过二维码方式
   * @param {string} [content=''] 验证信息
   * @returns {Promise} 返回Promise<Object>，注意捕捉catch
   * @memberof Padchat
   */
  async addContact(stranger, ticket, type = 3, content = '') {
    return await this.sendCmd('addContact', {
      stranger,
      ticket,
      type,
      content,
    })
  }

  /**
   * 打招呼
   *
   * @param {String} stranger 用户stranger数据
   * @param {String} ticket 用户ticket数据
   * @param {String} content 打招呼内容
   * @returns {Promise} 返回Promise<Object>，注意捕捉catch
   * @memberof Padchat
   */
  async sayHello(stranger, ticket, content = '') {
    return await this.sendCmd('sayHello', {
      stranger,
      ticket,
      content,
    })
  }

  /**
   * 设置备注
   *
   * @param {String} userId 用户wxid
   * @param {String} remark 备注名称
   * @returns {Promise} 返回Promise<Object>，注意捕捉catch
   * @memberof Padchat
   */
  async setRemark(userId, remark) {
    return await this.sendCmd('setRemark', {
      userId,
      remark,
    })
  }

  /** 朋友圈系列接口 */

  /**
   * 获取消息原始图片
   *
   * @param {Object} rawMsg 推送的消息结构体
   * @returns {Promise} 返回Promise<Object>，注意捕捉catch
   * @memberof Padchat
   */
  async getMsgImage(rawMsg) {
    return await this.sendCmd('getMsgImage', {
      rawMsg,
    })
  }

  /**
   * 上传图片到朋友圈
   *
   * @param {Buffer|String} image 图片Buffer数据或base64
   * @returns {Promise} 返回Promise<Object>，注意捕捉catch
   * @memberof Padchat
   */
  async snsUpload(image) {
    if (image instanceof Buffer) {
      image = image.toString('base64')
    }
    return await this.sendCmd('snsUpload', {
      image,
    })
  }

  /**
   * 操作朋友圈
   * FIXME: 此接口有问题，暂时无效
   *
   * @param {String} userId 用户wxid
   * @param {String} momentId 朋友圈消息id
   * @param {Number} type 操作类型
   * @returns {Promise} 返回Promise<Object>，注意捕捉catch
   * @memberof Padchat
   */
  async snsObjectOp(userId, momentId, type) {
    return await this.sendCmd('snsObjectOp', {
      userId,
      momentId,
      type,
    })
  }

  /**
   * 发朋友圈
   *
   * @param {String} content 内容文本
   * @returns {Promise} 返回Promise<Object>，注意捕捉catch
   * @memberof Padchat
   */
  async snsSendMoment(content) {
    return await this.sendCmd('snsSendMoment', {
      content,
    })
  }

  /**
   * 查看用户朋友圈
   *
   * @param {String} userId 用户wxid
   * @param {string} [momentId=''] 朋友圈消息id
   * @returns {Promise} 返回Promise<Object>，注意捕捉catch
   * @memberof Padchat
   */
  async snsUserPage(userId, momentId = '') {
    return await this.sendCmd('snsUserPage', {
      userId,
      momentId,
    })
  }

  /**
   * 查看朋友圈动态
   *
   * @param {string} [momentId=''] 朋友圈消息id
   * @returns {Promise} 返回Promise<Object>，注意捕捉catch
   * @memberof Padchat
   */
  async snsTimeline(momentId = '') {
    return await this.sendCmd('snsTimeline', {
      momentId,
    })
  }

  /**
   * 获取朋友圈消息详情
   *
   * @param {String} momentId 朋友圈消息id
   * @returns {Promise} 返回Promise<Object>，注意捕捉catch
   * @memberof Padchat
   */
  async snsGetObject(momentId) {
    return await this.sendCmd('snsGetObject', {
      momentId,
    })
  }

  /**
   * 评论朋友圈
   *
   * @param {String} userId 用户wxid
   * @param {String} momentId 朋友圈消息id
   * @param {String} content 内容文本
   * @returns {Promise} 返回Promise<Object>，注意捕捉catch
   * @memberof Padchat
   */
  async snsComment(userId, momentId, content) {
    return await this.sendCmd('snsComment', {
      userId,
      momentId,
      content,
    })
  }


  /** 收藏系列接口 */

  /**
   * 同步收藏消息
   *
   * @param {string} [favKey=''] 同步key
   * @returns {Promise} 返回Promise<Object>，注意捕捉catch
   * @memberof Padchat
   */
  async syncFav(favKey = '') {
    return await this.sendCmd('syncFav', {
      favKey,
    })
  }

  /**
   * 添加收藏
   *
   * @param {String} content 内容文本
   * @returns {Promise} 返回Promise<Object>，注意捕捉catch
   * @memberof Padchat
   */
  async addFav(content) {
    return await this.sendCmd('addFav', {
      content,
    })
  }

  /**
   * 获取收藏消息详情
   *
   * @param {Number} favId 收藏id
   * @returns {Promise} 返回Promise<Object>，注意捕捉catch
   * @memberof Padchat
   */
  async getFav(favId) {
    return await this.sendCmd('getFav', {
      favId,
    })
  }

  /**
   * 删除收藏
   *
   * @param {Number} favId 收藏id
   * @returns {Promise} 返回Promise<Object>，注意捕捉catch
   * @memberof Padchat
   */
  async deleteFav(favId) {
    return await this.sendCmd('deleteFav', {
      favId,
    })
  }

  /** 标签系列接口 */

  /**
   * 获取所有标签
   *
   * @returns {Promise} 返回Promise<Object>，注意捕捉catch
   * @memberof Padchat
   */
  async getLabelList() {
    return await this.sendCmd('getLabelList', {})
  }

  /**
   * 添加标签
   *
   * @param {String} label 标签名称
   * @returns {Promise} 返回Promise<Object>，注意捕捉catch
   * @memberof Padchat
   */
  async addLabel(label) {
    return await this.sendCmd('addLabel', {
      label,
    })
  }

  /**
   * 删除标签
   *
   * @param {String} labelId 标签id
   * @returns {Promise} 返回Promise<Object>，注意捕捉catch
   * @memberof Padchat
   */
  async deleteLabel(labelId) {
    return await this.sendCmd('deleteLabel', {
      labelId,
    })
  }
  /**
  deleteLabel: {
      auth: 'tag',
      rule: {
        labelId: 'string',
      },
    },
  */

  /**
   * 设置用户标签
   *
   * @param {String} userId 用户wxid
   * @param {String} labelId 标签id
   * @returns {Promise} 返回Promise<Object>，注意捕捉catch
   * @memberof Padchat
   */
  async setLabel(userId, labelId) {
    return await this.sendCmd('setLabel', {
      userId,
      labelId,
    })
  }

  /** 转账及红包接口 */

  /**
   * 查看转账消息
   *
   * @param {Object} rawMsg 推送的消息结构体
   * @returns {Promise} 返回Promise<Object>，注意捕捉catch
   * @memberof Padchat
   */
  async queryTransfer(rawMsg) {
    return await this.sendCmd('queryTransfer', {
      rawMsg,
    })
  }

  /**
   * 接受转账
   *
   * @param {Object} rawMsg 推送的消息结构体
   * @returns {Promise} 返回Promise<Object>，注意捕捉catch
   * @memberof Padchat
   */
  async acceptTransfer(rawMsg) {
    return await this.sendCmd('acceptTransfer', {
      rawMsg,
    })
  }

  /**
   * 接收红包
   *
   * @param {Object} rawMsg 推送的消息结构体
   * @returns {Promise} 返回Promise<Object>，注意捕捉catch
   * @memberof Padchat
   */
  async receiveRedPacket(rawMsg) {
    return await this.sendCmd('receiveRedPacket', {
      rawMsg,
    })
  }

  /**
   * 查看红包信息
   *
   * @param {Object} rawMsg 推送的消息结构体
   * @param {Number} [index=0] 列表索引。
   * 每页11个，查看第二页11，查看第三页22，以此类推
   * @returns {Promise} 返回Promise<Object>，注意捕捉catch
   * @memberof Padchat
   */
  async queryRedPacket(rawMsg, index = 0) {
    return await this.sendCmd('queryRedPacket', {
      rawMsg,
      index,
    })
  }

  /**
   * 领取红包
   *
   * @param {Object} rawMsg 推送的消息结构体
   * @param {String} key 红包的验证key，通过调用 receiveRedPacket 获得
   * @returns {Promise} 返回Promise<Object>，注意捕捉catch
   * @memberof Padchat
   */
  async openRedPacket(rawMsg, key) {
    return await this.sendCmd('openRedPacket', {
      rawMsg,
      key,
    })
  }

  /** 公众号系列接口 */

  /**
   * 获取公众号gh名称
   *
   * @param {String} userId 公众号wxid
   * @returns {Promise} 返回Promise<Object>，注意捕捉catch
   * @memberof Padchat
   */
  async getMpInfo(userId) {
    return await this.sendCmd('getMpInfo', {
      userId,
    })
  }

  /**
   * 获取公众号信息
   *
   * @param {String} ghName 公众号gh名称，即`gh_`格式的id
   * @returns {Promise} 返回Promise<Object>，注意捕捉catch
   * @memberof Padchat
   */
  async getSubscriptionInfo(ghName) {
    return await this.sendCmd('getSubscriptionInfo', {
      ghName,
    })
  }

  /**
   * 操作公众号菜单
   *
   * @param {String} ghName 公众号gh名称，即`gh_`格式的id
   * @param {Number} menuId 菜单id
   * @param {String} menuKey 菜单key
   * @returns {Promise} 返回Promise<Object>，注意捕捉catch
   * @memberof Padchat
   */
  async operateSubscription(ghName, menuId, menuKey) {
    return await this.sendCmd('operateSubscription', {
      ghName,
      menuId,
      menuKey,
    })
  }

  /**
   * 获取网页访问授权
   *
   * @param {String} ghName 公众号gh名称，即`gh_`格式的id
   * @param {String} url 网页url
   * @returns {Promise} 返回Promise<Object>，注意捕捉catch
   * @memberof Padchat
   */
  async getRequestToken(ghName, url) {
    return await this.sendCmd('getRequestToken', {
      ghName,
      url,
    })
  }

  /**
   * 访问网页
   *
   * @param {string} url 网页url地址
   * @param {string} xKey 访问Key
   * @param {string} xUin 访问uin
   * @returns {Promise} 返回Promise<Object>，注意捕捉catch
   * @memberof Padchat
   */
  async requestUrl(url, xKey, xUin) {
    return await this.sendCmd('requestUrl', {
      url,
      xKey,
      xUin,
    })
  }
}

function onEvent() {
  const io = this.io
  const socketEvents = [
    'connect',
    'connect',
    'connect_error',
    'connect_timeout',
    'error',
    'disconnect',
    'reconnect',
    'reconnect_attempt',
    'reconnecting',
    'reconnect_error',
    'reconnect_failed',
    'ping',
  ]

  const userEvents = [
    'qrcode', // 登陆二维码
    'scan', // 扫码登陆状态
    'login', // 登陆完成
    'loaded', // 通讯录载入完毕
    'logout', // 注销登录（账户退出）
    'close', // 任务断线
    'warn', // 错误
    'sns', // 朋友圈事件（朋友圈小圆点）
    // 'push', // 推送消息（系统、好友消息、联系人等）
  ]

  const events = new Set(socketEvents.concat(userEvents))

  events.forEach(event => {
    io.on(event, (...args) => {
      this.emit.apply(this, [event, ...args])
    })
  })

  io.on('push', data => {
    const { list } = data
    if (!Array.isArray(list)) {
      console.error('push 信息结构错误:', list)
      return
    }
    // 从push消息数组中拆分出单条消息
    list.forEach(msg => {
      this.emit('push', msg)
    })
  })
}

function clearRawMsg(obj) {
  if (typeof obj === 'object') {
    delete obj.data
  }
  return obj
}

/**
 * 生成随机设备信息
 *
 * @returns {Object} 设备信息
 */
function getRandomDevice() {
  const Random = require('random-js')
  const random = new Random()
  const arr = []
  for (let i = 0; i < 6; i++) {
    arr.push(random.hex(2))
  }
  return {
    deviceName: random.string(random.integer(4, 8)) + ' 的 ipad',
    deviceUuid: random.uuid4(Random.engines.nativeMath).toUpperCase(),
    deviceWifiName: random.string(random.integer(5, 10)),
    deviceWifiMac: arr.join(':').toUpperCase(),
  }
}

Padchat.Padchat = Padchat
Padchat.getRandomDevice = getRandomDevice
module.exports = Padchat
