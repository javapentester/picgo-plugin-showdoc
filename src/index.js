module.exports = (ctx) => {
  const register = () => {
    ctx.helper.uploader.register('showdoc', {
      handle,
      name: 'showdoc',
      config
    });
  };

  const config = (ctx) => {
    let userConfig = ctx.getConfig('picBed.showdoc');
    if (!userConfig) {
      userConfig = {};
    }
    return [
      {
        name: 'url',
        type: 'input',
        default: '',
        required: true,
        message: 'API URL',
        alias: 'API URL'
      },
      {
        name: 'cookie',
        type: 'input',
        default: '',
        required: false,
        message: 'Cookie',
        alias: 'Cookie'
      }
    ];
  };

  const handle = async (ctx) => {
    const userConfig = ctx.getConfig('picBed.showdoc');
    if (!userConfig) {
      throw new Error('No showdoc config!');
    }

    try {
      const imgList = ctx.output;
      for (let img of imgList) {
        const requestOptions = buildRequest(userConfig.url, img.buffer, img.fileName, userConfig);

        process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

        const response = await ctx.Request.request(requestOptions);
        ctx.log.info(`Uploading image response: ${response}`);

        const body = JSON.parse(response);
        if (body && body.url) {
          const finalUrl = await getFinalUrl(body.url);
          img.imgUrl = finalUrl;
        } else {
          throw new Error('Upload failed');
        }
      }
      return ctx;
    } catch (err) {
      ctx.emit('notification', {
        title: 'showdoc',
        body: 'Upload failed',
        text: err.message
      });
      throw err;
    }
  };

  const buildRequest = (url, image, fileName, userConfig = {}) => {
    const cookie = userConfig.cookie;
    const headers = {
      'Content-Type': 'multipart/form-data',
      'Cookie': cookie
    };

    const formData = {
      'editormd-image-file': {
        value: image,
        options: {
          filename: fileName
        }
      },
      'comment': `From PicGo - ${new Date().toLocaleDateString()}`
    };

    return {
      method: 'POST',
      url: url,
      headers: headers,
      formData: formData,
      timeout: 5000,
      maxRedirects: 10,
      rejectUnauthorized: false
    };
  };

  const getFinalUrl = async (url) => {
    try {
      const response = await ctx.Request.request({
        method: 'GET',
        url: url,
        followRedirect: true, // 自动跟随重定向
        rejectUnauthorized: false, // 关闭 SSL 证书验证
        maxRedirects: 10, // 最多跟随 10 次重定向
        resolveWithFullResponse: true // 返回完整的响应对象
      });

      // 从响应中获取最终的 URL
      const finalUrl = response.request.res.responseUrl;
      ctx.log.info(`Redirected to: ${finalUrl}`);

      // 返回最终的 URL
      return finalUrl;
      
    } catch (err) {
      throw new Error('Failed to retrieve final URL: ' + err.message);
    }
  };

  return {
    uploader: 'showdoc',
    register
  };
};
