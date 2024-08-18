# Use the official .NET SDK image as the build environment
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build-env
WORKDIR /App

# Copy the project files and restore dependencies
COPY ./ ./
RUN dotnet restore
RUN dotnet publish -c Release -o out

# Use the official .NET runtime image as the runtime environment
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /App

# Install Opus Codec, Sodium (libsodium), and other required packages
RUN apt-get update && apt-get install -y \
    ffmpeg \
    opus-tools \
    libopus0 \
    libopus-dev \
    libsodium23 \
    libsodium-dev \
    yt-dlp \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

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
