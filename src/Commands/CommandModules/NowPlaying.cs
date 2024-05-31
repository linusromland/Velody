using System.Threading.Channels;
using DSharpPlus;
using DSharpPlus.Entities;
using DSharpPlus.SlashCommands;
using Serilog;
using Velody.Server;
using Velody.Utils;
using Velody.Video;
using static Velody.Server.VoiceManager;

namespace Velody
{
    public class NowPlayingCommand(ServerManager serverManager, VideoHandler videoHandler) : ApplicationCommandModule
    {
        private readonly ILogger _logger = Logger.CreateLogger("NowPlayingCommand");
        private readonly ServerManager _serverManager = serverManager;
        private readonly VideoHandler _videoHandler = videoHandler;

        [SlashCommand("nowPlaying", "Shows the currently playing video.")]
        public async Task Play(InteractionContext ctx)
        {
            EmbedBuilder embed = new EmbedBuilder(ctx);
            try
            {
                Server.Server? server = _serverManager.GetServer(ctx.Guild.Id);

                if (server == null)
                {
                    embed.WithTitle("Error");
                    embed.WithDescription("An error occurred while trying to get the server.");
                    await embed.Send();
                    return;
                }

                DiscordChannel? voiceChannel = VoiceManager.GetVoiceChannel(ctx.Member.VoiceState);
                if (voiceChannel == null)
                {
                    embed.WithTitle("Error");
                    embed.WithDescription("You need to be in a voice channel to use this command.");
                    await embed.Send();
                    return;
                }

                VideoInfo? currentlyPlaying = server.Queue.CurrentlyPlaying;
                if (currentlyPlaying == null)
                {
                    embed.WithTitle("Error");
                    embed.WithDescription("There is no video currently playing.");
                    await embed.Send();
                    return;
                }


                embed.WithTitle($"Playing  `{currentlyPlaying.Title}`");
                embed.WithImage(currentlyPlaying.Thumbnail);
                embed.WithURL(currentlyPlaying.Url);


                TimeSpan currentPlayTime = server.VoiceManager.GetPlaybackDuration();
                TimeSpan totalDuration = new TimeSpan(0, 0, currentlyPlaying.Duration);
                string progressBar = CreateProgressBar(currentPlayTime, totalDuration, 15);
                string timeString = $"`{currentPlayTime:mm\\:ss} / {totalDuration:mm\\:ss}`";
                string requestedBy = $"Requested by <@{currentlyPlaying.UserId}>";
                embed.WithDescription($"{progressBar}\n{timeString}\n{requestedBy}");

                await embed.Send();
            }
            catch (Exception e)
            {
                _logger.Error(e, "An error occurred while executing the play command.");
                await embed.SendUnkownErrorAsync();
                return;
            }
        }

        static string CreateProgressBar(TimeSpan currentPlayTime, TimeSpan totalDuration, int barLength)
        {
            double percentagePlayed = currentPlayTime.TotalSeconds / totalDuration.TotalSeconds;
            int playedLength = (int)(percentagePlayed * barLength);

            return $"{new string('▬', playedLength)}🔘{new string('▬', barLength - playedLength)}";
        }
    }
}
