// var fs = require("fs");
// var node_path = require("path");
import fs from "fs";
import node_path from "path";

import { isImage, getImgNameByPath, distinct } from "./utils.mjs";
import { IMGS_FILE_PATH, STR_FILE_PATH, USELESS_IMG_FILE_PATH } from "./constants.mjs";


var imgsFilePath = node_path.resolve(IMGS_FILE_PATH);
var srcFilePath = node_path.resolve(STR_FILE_PATH);
var writeFilePath = node_path.resolve(USELESS_IMG_FILE_PATH);

let imgFileList = []; //存放图片文件路径的数组
let srcFileList = []; //文件路径的数组
let hasImgFlieList = []; // 包含图片的文件数组
let uselessImg = []; // 没有被使用过的图片
let imgBeUsedInTheFile = []; // 在文件中使用过的图片集合


var dirs = [];
dirs.push(imgsFilePath);

var srcDirs = [];
srcDirs.push(srcFilePath);

/**
 * 处理某个类目下所有文件及目录
 * @param files 文件。也可能是目录
 * @param file_path 文件或目录的上级目录
 * @param callback 一个目录或文件的判断结果的回调
 * @param allFilesDoneCallback 所有文件处理完成后的回调函数
 */
function forFiles(files, file_path, callback, allFilesDoneCallback) {
  var arrlength = files.length;
  if (!files || files.length == 0) {
    allFilesDoneCallback(file_path);
    return;
  }
  files.forEach(function (e, i) {
    var fullFilePath = node_path.join(file_path, e);

    fs.stat(fullFilePath, function (err, stat) {
      var result = {
        isDir: false,
        isFile: true,
        file: fullFilePath,
      };

      if (stat.isDirectory()) {
        result.isDir = true;
        result.isFile = false;
      } else {
        result.isDir = false;
        result.isFile = true;
      }
      //回调
      callback(result);
      arrlength--;
      //判断是否处理完毕
      if (arrlength == 0) {
        //回调所有文件处理完毕
        allFilesDoneCallback(file_path);
      }
    });
  });
}

/**
 * 处理单个目录
 * @param dirPath 目录路径
 * @param watchDir 监控的目录列表
 * @param callback 当目录处理完毕后的回调函数
 */
function forDir(dirPath, watchDir, callback) {
  fs.readdir(dirPath, function (err, files) {
    var subFiles = [];
    forFiles(
      files,
      dirPath,
      function (result) {
        //如果是目录，继续执行forDir并在之前将目录添加到watchDir
        //如果是文件，放入subFiles中
        if (result.isDir) {
          watchDir.push(result.file);
          forDir(result.file, watchDir, callback);
        } else {
          subFiles.push(result.file);
        }
      },
      function (processedDirPath) {
        //文件全部处理完毕后，执行回调函数通知指定目录遍历完毕，但不包括子目录
        callback(processedDirPath, subFiles);
      }
    );
  });
}

/**
 * 遍历处理多个类目
 * @param dirs 多个类目列表
 * @param doneCallback 处理完成的回调
 */
function forDirs(dirs, doneCallback) {
  var copiedDirs = dirs.slice(0);
  var watchDir = [];
  var allFiles = [];
  copiedDirs.forEach(function (path) {
    watchDir.push(path);
    //回调函数中判断watchDir长度是否为0，如为0，表示所有的目录及其子目录处理完毕了，通知最外层处理完毕
    //并将返回的文件信息合并
    forDir(path, watchDir, function (processedDirPath, subFiles) {
      allFiles = allFiles.concat(subFiles);
      // console.log('%s 处理完成',processedDirPath);
      watchDir.splice(watchDir.indexOf(processedDirPath), 1);
      if (watchDir.length == 0) {
        doneCallback(allFiles);
      }
    });
  });
}

/**
 * 获取所有图片的路径
 */
function getImgFilePath() {
  return new Promise((resolve, reject) => {
    forDirs(dirs, function (fileList) {
      resolve(fileList);
    });
  });
}

/**
 * 获取src目录下所有文件的路径
 */
function getFilePath() {
  return new Promise((resolve, reject) => {
    forDirs(srcDirs, function (fileList) {
      resolve(fileList);
    });
  });
}

/**
 * 把需要删除的图片路径集合放到 uselessImg.json 文件下，方便查看
 */
function creatUselessImgFile () {
    fs.writeFile(
        writeFilePath + "/uselessImg.json",
        JSON.stringify(uselessImg),
        function (err) {
          if (err) {
            return console.log(err);
          }
          console.log("The file was saved!");
        }
      );
}
/**
 * 找出没有用到的图片集合
 */
function findUselessImgFile () {
    let copeImgFileList = [...imgFileList]; // cope 一份图片列表
    imgFileList.forEach((item) => {
      // 图片
      let imgName = getImgNameByPath(item);
      hasImgFlieList.forEach((path) => {
        //文件
        let fileContent = fs.readFileSync(path, "utf8");
        if (fileContent.indexOf(imgName) >= 0) {
          let index = copeImgFileList.indexOf(item);
          index >= 0 && copeImgFileList.splice(index, 1);
          imgBeUsedInTheFile.push(item);
        }
      });
    });
    imgBeUsedInTheFile = distinct(imgBeUsedInTheFile); //去重
    uselessImg = copeImgFileList;
}
/**
 * 找出有使用图片的文件集合
 */
function findUsedImgFile (){
    srcFileList.forEach((path) => {
        let fileContent = fs.readFileSync(path, "utf8");
        isImage(fileContent.toString()) && hasImgFlieList.push(path);
    });
}
/**
 * 删除无用图片
 */
function removeUselessImg () {
  uselessImg.forEach((path) => {
    fs.unlink(path, (err) => {
      if (err) throw err;
    });
  });
}
async function main() {
  imgFileList = await getImgFilePath();
  srcFileList = await getFilePath();

  console.log("共有图片:", imgFileList.length);
  console.log("共有文件:", srcFileList.length);

  findUsedImgFile();//找出有使用图片的文件集合

  console.log("包含图片的文件有:", hasImgFlieList.length);

  findUselessImgFile() // 找出没有用到的图片

  console.log("使用过的图片:", imgBeUsedInTheFile.length);
  console.log("没有被使用过的图片:", uselessImg.length);

  creatUselessImgFile(); //创建uselessImg.json
  removeUselessImg(); //删除
}

main();
