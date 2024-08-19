using DSharpPlus;
using Microsoft.Extensions.Logging;
using Serilog;
using Velody.Video;

namespace Velody.Utils
{
    internal class GetUser
    {
        public static string GetNickname(DiscordClient client, VideoInfo video)
        {
            ulong userId = ulong.Parse(video.UserId);
            ulong serverId = ulong.Parse(video.GuildId);
            return GetNickname(client, userId, serverId);
        }

        public static string GetNickname(DiscordClient client, ulong userId, ulong serverId)
        {
            string userName = client.GetUserAsync(userId).Result.Username;
            string serverNickName = client.GetGuildAsync(serverId).Result.GetMemberAsync(userId).Result.Nickname;
            if (serverNickName != null)
            {
                userName = serverNickName;
            }

            return userName;
        }

    }
}
