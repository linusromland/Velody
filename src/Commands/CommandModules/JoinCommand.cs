using System.Threading.Channels;
using DSharpPlus;
using DSharpPlus.Entities;
using DSharpPlus.SlashCommands;

namespace Velody
{
    public class JoinCommand(ServerManager serverManager) : ApplicationCommandModule
    {

        private readonly ServerManager _serverManager = serverManager;

        [SlashCommand("join", "Joins your voice channel.")]
        public async Task Join(InteractionContext ctx)
        {

            Server? server = _serverManager.GetServer(ctx.Guild.Id);

            if (server == null)
            {
                await ctx.CreateResponseAsync(InteractionResponseType.ChannelMessageWithSource, new DiscordInteractionResponseBuilder().WithContent("Something went wrong getting the server."));
                return;
            }

            DiscordVoiceState voiceState = ctx.Member.VoiceState;
            if (voiceState == null)
            {
                await ctx.CreateResponseAsync(InteractionResponseType.ChannelMessageWithSource, new DiscordInteractionResponseBuilder().WithContent("You need to be in a voice channel."));
                return;
            }

            DiscordChannel channel = voiceState.Channel;
            if (channel == null)
            {
                await ctx.CreateResponseAsync(InteractionResponseType.ChannelMessageWithSource, new DiscordInteractionResponseBuilder().WithContent("You need to be in a voice channel."));
                return;
            }

            try
            {
                await server.VoiceManager.JoinVoiceChannelAsync(channel);
            }
            catch (Exception e)
            {
                await ctx.CreateResponseAsync(InteractionResponseType.ChannelMessageWithSource, new DiscordInteractionResponseBuilder().WithContent(e.Message));
                return;
            }

            await ctx.CreateResponseAsync(InteractionResponseType.ChannelMessageWithSource, new DiscordInteractionResponseBuilder().WithContent("Joined voice channel."));

        }
    }
}
