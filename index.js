"use strict"

var koa = require('koa');
var app = new koa();
var getRawBody = require('./raw')
var model =  require('./model')
var authMiddle = require('./auth')
var fileMiddle = require('./file')

var body = require('koa-better-body')

model.connect('mongodb://localhost:27017/im_dev')
//文件处理
// app.use(body())
app.use(fileMiddle.middle)



app.use(async (ctx, next) => {
    try {
        const buf = await getRawBody(ctx.req)
        ctx.rawBody = buf.toString()
        console.log('--',new Date(),ctx.path,'\nrequest::json\n',ctx.rawBody)
        await next()
        console.log('response::json\n',ctx.body)
    } catch (err) {
        console.log(err)
        ctx.body = { message: err.message };
        ctx.status = err.status || 500;
    }
})
//访问权限
app.use(authMiddle.middle)
//特殊接口 ...

app.use(async (ctx,next) => {
    let urls = ctx.path.split('/')
    let clt = urls[1] || 'Color'
    let method = urls[2] || 'fetch'
    let {id,filter,limit,startPos,orderBy,item,cnum} = JSON.parse(ctx.rawBody)
    console.log(clt,method,{id,filter,limit,startPos,orderBy})

    if((method === 'addItem' || method.endsWith('Num')  || method.endsWith('ById')) && clt in model &&  method in model[clt]){
        let ret 
        if(method.endsWith('Num')){
            ret = await model[clt][method](cnum,ctx)
        }else{
            ret = await model[clt][method](id,item,ctx)
        }
        ctx.body = {status:'success',msg:'hello world!',data:{item:ret}}
    }else{
        let {list,count} = await model[clt][method](filter,orderBy,limit,startPos)
        ctx.body = {status:'success',msg:'hello world!',data:{list,count}}
    }
});

app.listen(10000);