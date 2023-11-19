pipeline {
    agent any

    environment {
        DOCKER_REGISTRY = 'ghcr.io'
        DOCKER_REPO = 'linusromland/velody'
        IMAGE_NAME = 'velody'
        GITHUB_USER = 'linusromland'
        GITHUB_TOKEN = credentials('gh_token')
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Extract Version') {
            steps {
                script {
                    def packageJson = readJSON file: 'package.json'
                    currentVersion = packageJson.version
                    echo "Current version: ${currentVersion}"
                }
            }
        }

        stage('Check Latest Tag') {
            steps {
                script {
                    def latestTag = sh(script: "git ls-remote --tags --sort='v:refname' git://github.com/${DOCKER_REPO}.git | tail -n 1 | sed 's/.*\\///'", returnStdout: true).trim()
                    echo "Latest tag: ${latestTag}"

                    if (latestTag != currentVersion) {
                        echo "New version found. Proceeding to build, push Docker image and create release."
                        buildAndPush = true
                    } else {
                        echo "No new version. Skipping Docker build, push and release creation."
                        buildAndPush = false
                    }
                }
            }
        }

        stage('Build and Push Docker Image') {
            when {
                expression { buildAndPush == true }
            }
            steps {
                script {
                    // Login to GitHub Container Registry
                    sh "echo $GITHUB_TOKEN | docker login ${DOCKER_REGISTRY} -u $GITHUB_USER --password-stdin"

                    // Build the Docker image
                    sh "docker build -t ${DOCKER_REGISTRY}/${DOCKER_REPO}:${currentVersion} -t ${DOCKER_REGISTRY}/${DOCKER_REPO}:latest ."

                    // Push the specific version
                    sh "docker push ${DOCKER_REGISTRY}/${DOCKER_REPO}:${currentVersion}"

                    // Push the :latest version
                    sh "docker push ${DOCKER_REGISTRY}/${DOCKER_REPO}:latest"
                }
            }
        }

        stage('Create GitHub Release') {
            when {
                expression { buildAndPush == true }
            }
            steps {
                script {
                    def changelog = readFile 'CHANGELOG.md'
                    def currentChangelog = changelog.split("## \\[").find { it.startsWith("${currentVersion}]") }
                    def releaseNotes = ""
                    
                    if (currentChangelog) {
                        releaseNotes = """
                            ## Changelog for Release ${currentVersion}\n
                            ${currentChangelog}\n
                            ## How to Run\n
                            \`\`\`
                            docker pull ${DOCKER_REGISTRY}/${DOCKER_REPO}:${currentVersion}
                            docker run -d ${DOCKER_REGISTRY}/${DOCKER_REPO}:${currentVersion}
                            \`\`\`
                            """
                    } else {
                        releaseNotes = "No specific changelog for version ${currentVersion}."
                    }

                    def payload = JsonOutput.toJson([
                        tag_name: currentVersion,
                        name: "Release ${currentVersion}",
                        body: releaseNotes,
                        draft: false,
                        prerelease: false
                    ])

                    sh "curl -H 'Authorization: token ${GITHUB_TOKEN}' -d '${payload}' https://api.github.com/repos/${DOCKER_REPO}/releases"
                }
            }
        }
    }
}
