const xl = require('excel4node');
const PassThrough = require('stream').PassThrough;
const model = require('../../model')
const sharp = require('sharp')
const BufferHelper = require('bufferhelper');


const cols = [
{key:'cnum',name:'编号',width:20}
,{key:'name',name:'名字',width:20}
,{key:'address',name:'地址',width:20}
,{key:'center_num',name:'设计中心',width:20}
,{key:'order_type',name:'订单类型',width:20}
,{key:'product_type',name:'产品类型',width:20}
,{key:'contract_money',name:'订单金额',width:20}
,{key:'order_at',name:'下单时间',width:20}
,{key:'supplier_name',name:'供应商',width:20}
,{key:'brand_num',name:'品牌',width:20},
{key:'currency_num',name:'结算币种',width:20},
{key:'AntRate',name:'预估汇率',width:20},
{key:'SpayBatch',name:'实际应付供应商款项（原币）',width:20},
{key:'payOriginMoney',name:'已付供应商款项（原币）',width:20},
{key:'payChinaMoney',name:'已付供应商款项（人民币）',width:20},
{key:'noPay',name:'尚未支付供应商款项（原币）',width:20},
{key:'AntnoPay',name:'预估尚未支付供应商款项（人民币）',width:20},
{key:'profit',name:'毛利率',width:20}]

let  sum = dl=> dl.length > 1 ? dl.pop()+sum(dl) : dl[0]
exports.middle = async (ctx, next) => {
  let item = await model.Session.getById({_id:ctx.query.token})
  let sessionData
  if(item){
      sessionData = Object.assign({},JSON.parse(item.data))
      ctx.body = {status:'success',data:{item:sessionData.user}}
  }else{
      ctx.body = {status:'wrong',msg:'请使用/auth/login接口登录'}
      return
  }

  var wb = new xl.Workbook();
  var ws = wb.addWorksheet('结算报表');
  var style = wb.createStyle({font: {color: '#000000',size: 12},numberFormat: '$#,##0.00; ($#,##0.00); -'});
  let flt
  if(sessionData.user.role == 'accountant_manager'){
    flt ={}
  }else {
    flt = {ownByUser:sessionData.user.cnum}
  }


    //国外的结算数据
    let ordRes = await model.Purchase.fetch(flt,'-_id',10000*10000,0)
    let _filter={cnum:{$in:ordRes.list.map(v=>v.customer_num)}}
    let cusRes = await model.Customer.fetch(_filter,'-_id',10000*10000,0)
    _filter = {purchase_num:{$in:ordRes.list.map(d=>d.cnum)}}
    let payRes = await model.Pay.fetch(_filter,'-_id',10000*10000,0)
    let cusArr=[]
    cusRes.list.map(d => {
        let cust={}
        ordRes.list.map(v=>{
            if(d.cnum==v.customer_num){
                var cust={}
                cust=Object.assign(cust,{name:d.name,address:d.address,customer:d.cnum,center_num:d.center_num},v)
                cusArr.push(cust);
            }
        })
    })
    let payArr=[]
    let cmap = {'人民币':1,'欧元':7.5,'美元':6.5}
    payRes.list.map(p=>{
        let payObj={}
        cusArr.map(c=>{
            if(c.cnum==p.purchase_num){
                payObj=Object.assign({},c,
                    {
                        order_type:p.itype,AntRate:cmap[p.itype],SpayBatch:p.purchase_money,
                        payBatch:p.batch,payOriginMoney:sum(p.batch.map(b=>parseFloat(b.purchase_money))).toFixed(2),
                        payChinaMoney:sum(p.batch.map(b=>parseFloat(b.china_money))).toFixed(2),noPay:((p.purchase_money)- sum(p.batch.map(b=>parseFloat(b.purchase_money)))).toFixed(2),
                        AntnoPay:cmap[p.itype]*((p.purchase_money)- sum(p.batch.map(b=>parseFloat(b.purchase_money)))).toFixed(2),
                        profit:(parseFloat(c.contract_money-p.purchase_money*cmap[p.itype])/c.contract_money).toFixed(2)})
                payArr.push(payObj)
            }
        })
    })

    payRes.list=payArr
    //国内的结算数据
    let PurchasecnRes = await model.Purchasecn.fetch({},'-_id',10000*10000,0)
    let _filtercn={cnum:{$in:PurchasecnRes.list.map(v=>v.customer_num)}}
    let cuscnRes = await model.Customer.fetch(_filtercn,'-_id',10000*10000,0)
    _filtercn = {purchase_num:{$in:PurchasecnRes.list.map(d=>d.cnum)}}
    let paycnRes = await model.Pay.fetch(_filtercn,'-_id',10000*10000,0)
    let cuscnArr=[]
    cuscnRes.list.map(d => {
        let cust={}
        PurchasecnRes.list.map(v=>{
            if(d.cnum==v.customer_num){
                var cust={}
                cust=Object.assign(cust,{name:d.name,address:d.address,customer:d.cnum,center_num:d.center_num},v)
                cuscnArr.push(cust);
            }
        })
    })
    let paycnArr=[]
    paycnRes.list.map(p=>{
        let payObj={}
        cuscnArr.map(c=>{
            if(c.cnum==p.purchase_num){
                payObj=Object.assign({},c,
                    {
                        order_type:p.itype,AntRate:cmap[p.itype],SpayBatch:p.purchase_money,
                        payBatch:p.batch,payOriginMoney:sum(p.batch.map(b=>parseFloat(b.purchase_money))).toFixed(2),
                        payChinaMoney:sum(p.batch.map(b=>parseFloat(b.china_money))).toFixed(2),noPay:((p.purchase_money)- sum(p.batch.map(b=>parseFloat(b.purchase_money)))).toFixed(2),
                        AntnoPay:cmap[p.itype]*((p.purchase_money)- sum(p.batch.map(b=>parseFloat(b.purchase_money)))).toFixed(2),
                        profit:(parseFloat(c.contract_money-p.purchase_money*cmap[p.itype])/c.contract_money).toFixed(2)})
                paycnArr.push(payObj)
            }
        })
    })
    paycnRes.list=paycnArr
    let arr =  paycnRes.list.concat(payRes.list);
    console.log('arrr',arr)

   payRes.list = arr
     //对国内，国外的采购单按 下单时间进行排序
  function quickSort(arr,name,snum){
         //如果数组<=1,则直接返回
         if(arr.length<=1){return arr;}
         var pivotIndex=Math.floor(arr.length/2);
         //找基准，并把基准从原数组删除
         var pivot=arr.splice(pivotIndex,1)[0];
         var middleNum=pivot[name];
         // 定义左右数组
         var left=[];
         var right=[];
         //比基准小的放在left，比基准大的放在right
         if(snum){
             for(var i=0;i<arr.length;i++){
                 if(arr[i][name]>middleNum){
                 left.push(arr[i]);
                 }else{
                 right.push(arr[i]);
                 }
             }
         }else{
             for(var i=0;i<arr.length;i++){
                 if(arr[i][name]<=middleNum){
                 left.push(arr[i]);
                 }else{
                 right.push(arr[i]);
                 }
             }
         }
         //递归,返回所需数组
         return quickSort(left,name,snum).concat([pivot],quickSort(right,name,snum));
 }
  payRes.list = quickSort(arr,"order_at",true);
  console.log('payRes.length',payRes.list.length)
  let line = 1 ;
  let col = 1;
  for(let d of cols){
      ws.column(col).setWidth(d.width);
      ws.cell(line,col++).string(d.name).style(style)
  }
  for (let st of payRes.list){
    ws.row(++line).setHeight(50);
    col=1
    for(let d of cols){
        let v = st[d.key] 
        try{ws.cell(line,col++).string(v).style(style)}catch(err){console.log(err)}
    }


  }
  ctx.body = await  wb.writeToBuffer()
  ctx.type = 'application/vnd.ms-excel';
  ctx.set('Content-disposition','attachment;filename=jiesuan.xlsx');


}
