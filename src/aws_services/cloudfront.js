const { getSignedUrl } = require('@aws-sdk/cloudfront-signer');
const {AWS_CLOUDFRONT_VARS} = require("../config/aws_config.js");

function get_SignedUrl(file_name, expireDate) {
    const signedUrl =getSignedUrl({
        url: AWS_CLOUDFRONT_VARS.url + file_name,
        keyPairId: AWS_CLOUDFRONT_VARS.key_pair_id,
        privateKey: AWS_CLOUDFRONT_VARS.private_key,
        dateLessThan: expireDate
    });
    return signedUrl;
}

const CLOUDFRONT={
    get_SignedUrl
}

module.exports = CLOUDFRONT;