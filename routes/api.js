/**
 * Created by Jsceoz on 2017/4/17.
 */
var Web3 = require('web3');
var cc = require('./CertSave.json');
var redis = require('redis');
var BloomFilter = require('bloomfilter');
var sha256 = require('js-sha256').sha256;
var express = require('express');
var router = express.Router();


//web3
var web3 = new Web3();
var abi = cc;
web3.setProvider(new web3.providers.HttpProvider('http://localhost:8545'));
var MyContract = web3.eth.contract(abi.abi);
var myContractInstance = MyContract.at('0x3fd2931b3194c628afbc6011bd9aac440f62e1d2');

//redis
var redis_cilent = redis.createClient('6379', '127.0.0.1');

//bloom-filter
var bloom = new BloomFilter.BloomFilter(
    32 * 256, // number of bits to allocate.
    16        // number of hash functions.
);

//input: subject id
//return: highOfBlock, hashOfCertificate
router.get('/get-info', function (req, res) {
    var subjectId = req.query.subjectid;
    var height = 0;
    var hashOfCertificate = '';

    //query the operating in the redis
    redis_cilent.get('operating', function (err, reply) {
        var operating = JSON.parse(reply);
        for(var i = operating.length - 1; i >= 0; i--) {
            if (operating[i]['subjectUniqueID'] === subjectId) {
                height = operating[i]['highofblock'];
                hashOfCertificate = operating[i]['hashOfCertificate'];
                break
            }
        }
    });

    if (height === '') height = 0;

    res.json({"highofblock": height, "hashofcertificate": hashOfCertificate});
    res.status(200)
});

//receive the operating, add to the BlockChain and store in the data center
router.post('/operating', function (req, res) {
    var data = req.body;
    var input = sha256(JSON.stringify(data));
    var result = myContractInstance.insert_cert(input, "", {from: web3.eth.accounts[0], gas: 1000000});

    bloom.add(input);


    function getRawDataAndAddNewData(key_name, data) {
        redis_cilent.get(key_name, function (err, reply) {
            var raw_data = JSON.parse(reply);
            if(raw_data === null) {
                raw_data = []
            }
            var data_json = raw_data;
            data_json.push(data);

            var data_string = JSON.stringify(data_json);
            redis_cilent.set(key_name, data_string)

        });
    }

    getRawDataAndAddNewData('transaction', web3.eth.getTransaction(result));
    getRawDataAndAddNewData('operating', data);

    res.json(req.body);
    res.status(200)
});

//query the operating in redis
router.get('/operating', function (req, res) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Content-Length, Authorization, Accept, X-Requested-With , yourHeaderFeild');
    res.header('Access-Control-Allow-Methods', 'PUT, POST, GET, DELETE, OPTIONS');

    redis_cilent.get('operating', function (err, reply) {
        res.json(JSON.parse(reply))
    })
});

//query the blocks in the block chain
router.get('/blocks', function (req, res) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Content-Length, Authorization, Accept, X-Requested-With , yourHeaderFeild');
    res.header('Access-Control-Allow-Methods', 'PUT, POST, GET, DELETE, OPTIONS');

    var block_number = web3.eth.blockNumber;
    var blocks = [];
    for(var i = 0; i < block_number; i++) {
        blocks[i] = web3.eth.getBlock(i)
    }
    res.json(blocks);
    res.status(200)
});

//check the operating if in the block chain
router.post('/check_operating', function (req, res) {
    var op = sha256(JSON.stringify(req.body));
    var result = bloom.test(op);

    res.json({'result': result});
    res.status(200)
});

module.exports = router;





