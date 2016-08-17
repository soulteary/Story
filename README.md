# Story.md

Tell a story, easier.


## Docs

1.[Project Structure](./doc/structure).

## Cmd

- Convert

`npm run convert`

将之前转换的md文档转化为hexo格式.

- reset

`npm run reset`

清理目录内md文档.


## 关于转换

- 优先获取文章同名json描述文件的信息, 如果获取不到, 尝试通过环境变量来获取,例如路径, 最后尝试获取文件本身,即解析内容,获取文件属性.
- 描述文件缺失,取环境信息，描述文件出错,那么停止转换
- 支持保持目录结构转换, 支持转换单一文件。
