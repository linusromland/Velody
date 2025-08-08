FROM ubuntu:24.04 AS build-env

# Install dependencies for building
RUN apt-get update && apt-get install -y \
    wget curl apt-transport-https ca-certificates gnupg \
    && rm -rf /var/lib/apt/lists/*

# Add Microsoft package repo for Ubuntu 24.04
RUN wget https://packages.microsoft.com/config/ubuntu/24.04/packages-microsoft-prod.deb -O packages-microsoft-prod.deb \
    && dpkg -i packages-microsoft-prod.deb \
    && rm packages-microsoft-prod.deb \
    && apt-get update \
    && apt-get install -y dotnet-sdk-9.0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /App
COPY ./ ./
RUN dotnet restore
RUN dotnet publish -c Release -o out

# Runtime stage
FROM ubuntu:24.04

# Install runtime dependencies in one go
RUN apt-get update && apt-get install -y \
    ffmpeg \
    opus-tools \
    libopus0 \
    libopus-dev \
    libsodium23 \
    libsodium-dev \
    yt-dlp \
    wget curl apt-transport-https ca-certificates gnupg \
    && wget https://packages.microsoft.com/config/ubuntu/24.04/packages-microsoft-prod.deb -O packages-microsoft-prod.deb \
    && dpkg -i packages-microsoft-prod.deb \
    && rm packages-microsoft-prod.deb \
    && apt-get update \
    && apt-get install -y dotnet-runtime-9.0 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /App
COPY --from=build-env /App/out .

VOLUME ["/cache"]
VOLUME ["/logs"]

# Environment variables (optional defaults)
ARG DiscordBotToken
ARG DiscordGuildId
ARG GoogleApiKey
ARG OpenAIApiKey
ARG PresenterEnabled
ARG TextGenerator
ARG AnnouncePercentage

ENTRYPOINT ["dotnet", "Velody.dll"]
