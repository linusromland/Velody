# Use Ubuntu as the base image
FROM ubuntu:22.04 AS build-env

# Install necessary dependencies for .NET and your application
RUN apt-get update && apt-get install -y \
    wget \
    curl \
    apt-transport-https \
    ca-certificates \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# Install .NET SDK
RUN wget https://packages.microsoft.com/config/ubuntu/22.04/packages-microsoft-prod.deb -O packages-microsoft-prod.deb \
    && dpkg -i packages-microsoft-prod.deb \
    && rm packages-microsoft-prod.deb \
    && apt-get update \
    && apt-get install -y dotnet-sdk-8.0 \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /App

# Copy the project files and restore dependencies
COPY ./ ./
RUN dotnet restore
RUN dotnet publish -c Release -o out

# Use Ubuntu as the base image for the runtime environment
FROM ubuntu:22.04

# Install dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    opus-tools \
    libopus0 \
    libopus-dev \
    libsodium23 \
    libsodium-dev \
    wget \
    curl \
    apt-transport-https \
    ca-certificates \
    gnupg \
    software-properties-common \
    && wget https://packages.microsoft.com/config/ubuntu/22.04/packages-microsoft-prod.deb -O packages-microsoft-prod.deb \
    && dpkg -i packages-microsoft-prod.deb \
    && rm packages-microsoft-prod.deb \
    && apt-get update \
    && apt-get install -y dotnet-runtime-8.0 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp
RUN add-apt-repository ppa:tomtomtom/yt-dlp -y
RUN apt update                                 
RUN apt install yt-dlp -y                      

# Set the working directory
WORKDIR /App

# Copy the built application from the build environment
COPY --from=build-env /App/out .

# Define volumes for cache and logs
VOLUME ["/cache"]
VOLUME ["/logs"]

# Define environment variables (these are placeholders, you can set them at runtime)
ARG DiscordBotToken
ARG DiscordGuildId
ARG GoogleApiKey
ARG OpenAIApiKey
ARG PresenterEnabled
ARG TextGenerator
ARG AnnouncePercentage

# Set the entry point for the application
ENTRYPOINT ["dotnet", "Velody.dll"]
