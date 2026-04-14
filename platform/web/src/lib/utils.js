/**
 * utils.js - 工具函数库
 * 
 * 主要功能：提供cn()函数来动态合并Tailwind CSS类名
 */

import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * cn()函数 - 聪明的类名合并工具
 * 
 * 为什么需要这个函数？
 * 在React中写动态样式时经常会遇到这个问题：
 * 
 * 错误的方式：
 *   className={`px-4 ${disabled ? 'bg-gray' : 'bg-blue'}`}
 *   问题：同一个Tailwind属性（background）有两个类声明
 *   Tailwind CSS会带有不确定的优先级，可能显示错误的颜色
 * 
 * 正确的方式：
 *   className={cn('px-4', disabled ? 'bg-gray' : 'bg-blue')}
 *   原理：cn()函数智能检测相同的Tailwind属性，自动移除冲突
 *   只保留最后一个（或优先级最高的）版本
 * 
 * 函数工作流程：
 * 1. clsx(...inputs)：合并所有输入的类名，处理条件渲染
 *    示例：clsx('px-4', false && 'hidden', true && 'text-white')
 *    结果：'px-4 text-white'
 * 
 * 2. twMerge(结果)：移除Tailwind CSS冲突
 *    输入：'px-4 bg-blue bg-gray'
 *    输出：'px-4 bg-gray'（保留最后的bg-gray）
 * 
 * 实战例子：
 *   const buttonClass = cn(
 *     "px-4 py-2 rounded",                    // 基础样式
 *     disabled && "opacity-50 cursor-not-allowed",  // 禁用状态
 *     variant === 'primary' ? 'bg-blue' : 'bg-gray'  // 变体样式
 *   );
 * 
 * @param {...any} inputs - 任意数量的类名字符串或条件表达式
 * @returns {string} 合并后的类名字符串（冲突已解决）
 */
export function cn(...inputs) {
  // 第一步：clsx把所有输入合并成一个字符串
  // 第二步：twMerge解决Tailwind类名冲突
  return twMerge(clsx(inputs));
}
