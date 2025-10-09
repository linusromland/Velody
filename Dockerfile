FROM ubuntu:24.04 AS build-env

# Install system dependencies
RUN apt-get update && apt-get install -y \
    wget \
    curl \
    apt-transport-https \
    ca-certificates \
    gnupg \
    software-properties-common

# Add .NET repository and install SDK
RUN add-apt-repository ppa:dotnet/backports -y && \
    apt-get update && \
    apt-get install -y dotnet-sdk-9.0 && \
    rm -rf /var/lib/apt/lists/*

# Build the application
WORKDIR /App
COPY . .
RUN dotnet restore
RUN dotnet publish -c Release -o out


FROM ubuntu:24.04

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    opus-tools \
    libopus0 \
    libopus-dev \
    libsodium23 \
    libsodium-dev \
    yt-dlp \
    wget \
    curl \
    apt-transport-https \
    ca-certificates \
    gnupg \
    software-properties-common

# Add .NET repository and install runtime
RUN add-apt-repository ppa:dotnet/backports -y && \
    apt-get update && \
    apt-get install -y dotnet-runtime-9.0 && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Setup working directory and copy published output
WORKDIR /App
COPY --from=build-env /App/out .

# Define volumes
VOLUME ["/cache"]
VOLUME ["/logs"]

# Build arguments
ARG DiscordBotToken
ARG DiscordGuildId
ARG GoogleApiKey
ARG OpenAIApiKey
ARG PresenterEnabled
ARG TextGenerator
ARG AnnouncePercentage

ENTRYPOINT ["dotnet", "Velody.dll"]
