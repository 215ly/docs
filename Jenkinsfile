// Jenkins流水线文件


pipeline{
    agent any

    stages{
        stage("构建代码"){
            steps{
                echo "检查node环境"
                sh 'node -v'
                echo "修改npm下载源"
                sh 'npm config set registry https://registry.npmmirror.com'
                echo "安装依赖"
                sh 'npm install'
                echo "执行构建命令"
                sh 'npm run docs:build'
            }
        }

        stage("打包制品，备份历史版本"){
            steps{
                dir('.vitepress/dist'){ // 切换到dist目录里面，如果不切换，默认在/var/jenkins_home/workspace/项目名
                    sh 'ls -al'
                    sh 'tar -zcvf docs.tar.gz *' // 打包成压缩包
                    archiveArtifacts allowEmptyArchive: true, // 归档为空时不引起构建失败
                                        artifacts: 'docs.tar.gz',  // 需要保存的制品文件名
                                        fingerprint: true, // 记录成品的
                                        onlyIfSuccessful: true // 构建成功时才归档

                }
            }
        }
    }
}