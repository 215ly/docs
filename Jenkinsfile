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
                echo "打印出构建完成后的目录结构"
                sh 'ls .vitepress/'
            }
        }
    }
}