


/**
 * 判断是不是图片
 * @param {String} str 字符串
 */
export const isImage = (str) => {
    var reg = /\.(png|jpg|gif|jpeg|webp)/;
    return reg.test(str);
}

/**
 * 根据路径获取图片名称
 * @param {String} path 图片路径
 */
export const getImgNameByPath = (path) =>{
    var filename = '';
    //如果包含有"/"号 从最后一个"/"号+1的位置开始截取字符串
    if(path.indexOf("\\")>0) {
        filename=path.substring(path.lastIndexOf("\\")+1,path.length);
    } else {
        filename=path;
    }
    return filename;
}
/**
 * 数组去重
 * @param {*} arr 
 */
export const distinct = (arr) => {
    return Array.from(new Set(arr))
}