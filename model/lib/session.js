"use strict"
var _ = require('underscore')
var Base = require('./_base')

var keys = exports.keys = Object.assign({},Base.keys,{
        userName: {
            type: String,
            default: ''
        },
        data: {
            type: String,
            default: ''
        }
    })
exports. PRE = 'SN'
Base._getThis(exports,keys,__filename)
