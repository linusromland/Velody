FROM ubuntu:24.04 AS build-env

RUN apt-get update && apt-get install -y \
    wget \
    curl \
    apt-transport-https \
    ca-certificates \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

RUN wget https://packages.microsoft.com/config/ubuntu/22.04/packages-microsoft-prod.deb -O packages-microsoft-prod.deb \
    && dpkg -i packages-microsoft-prod.deb \
    && rm packages-microsoft-prod.deb \
    && apt-get update \
    && apt-get install -y dotnet-sdk-9.0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /App

COPY ./ ./
RUN dotnet restore
RUN dotnet publish -c Release -o out

FROM ubuntu:24.04

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
    && apt-get install -y dotnet-runtime-9.0 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

RUN add-apt-repository ppa:tomtomtom/yt-dlp -y
RUN apt update                                 
RUN apt install yt-dlp -y                      

WORKDIR /App

COPY --from=build-env /App/out .

VOLUME ["/cache"]
VOLUME ["/logs"]

ARG DiscordBotToken
ARG DiscordGuildId
ARG GoogleApiKey
ARG OpenAIApiKey
ARG PresenterEnabled
ARG TextGenerator
ARG AnnouncePercentage

ENTRYPOINT ["dotnet", "Velody.dll"]
