/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const browserslist = require('browserslist');
const chalk = require('chalk');
const os = require('os');
const inquirer = require('inquirer');
const pkgUp = require('pkg-up');
const fs = require('fs');

const defaultBrowsers = [
  '>0.2%',
  'not dead',
  'not ie <= 11',
  'not op_mini all',
];

/**
 * 如果是交互式命令行，问用户是否愿意添加 target browsers
 */
function shouldSetBrowsers(isInteractive) {
  if (!isInteractive) {
    return Promise.resolve(true);
  }

  const question = {
    type: 'confirm',
    name: 'shouldSetBrowsers',
    message:
      chalk.yellow("We're unable to detect target browsers.") +
      `\n\nWould you like to add the defaults to your ${chalk.bold(
        'package.json'
      )}?`,
    default: true,
  };

  return inquirer.prompt(question).then(answer => answer.shouldSetBrowsers);
}

/**
 * 查找配置，package.json 中的 "browserslist"，或者 .browserslistrc
 * 没找到配置会提示用户是否在 package.json 中添加默认配置
 * 用户选择不添加，命令行会给出提示
 * 
 */
function checkBrowsers(dir, isInteractive, retry = true) {
  const current = browserslist.findConfig(dir);
  if (current != null) {
    return Promise.resolve(current);
  }

  if (!retry) {
    return Promise.reject(
      new Error(
        chalk.red(
          'As of react-scripts >=2 you must specify targeted browsers.'
        ) +
          os.EOL +
          `Please add a ${chalk.underline(
            'browserslist'
          )} key to your ${chalk.bold('package.json')}.`
      )
    );
  }

  return shouldSetBrowsers(isInteractive).then(shouldSetBrowsers => {
    /**
     * 用户选择不添加默认，命令行给出提示
     */
    if (!shouldSetBrowsers) {
      return checkBrowsers(dir, isInteractive, false);
    }

    /**
     * 查找最近的 package.json，写入默认的配置到 "browserslist" 字段
     */
    return (
      pkgUp(dir)
        .then(filePath => {
          if (filePath == null) {
            return Promise.reject();
          }
          const pkg = JSON.parse(fs.readFileSync(filePath));
          pkg['browserslist'] = defaultBrowsers;
          fs.writeFileSync(filePath, JSON.stringify(pkg, null, 2) + os.EOL);

          browserslist.clearCaches();
          console.log();
          console.log(
            `${chalk.green('Set target browsers:')} ${chalk.cyan(
              defaultBrowsers.join(', ')
            )}`
          );
          console.log();
        })
        // Swallow any error
        .catch(() => {})
        .then(() => checkBrowsers(dir, isInteractive, false))
    );
  });
}

module.exports = { defaultBrowsers, checkBrowsers };
