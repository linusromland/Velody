using DSharpPlus;
using DSharpPlus.Entities;
using DSharpPlus.VoiceNext;
using Serilog;
using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Velody.Utils;

namespace Velody.Server
{
    public class VoiceManager : IAsyncDisposable
    {
        private readonly ILogger _logger = Logger.CreateLogger("VoiceManager");
        private readonly DiscordClient _client;
        private VoiceNextConnection? _vnc;
        private DateTime _playbackStartTime;
        private CancellationTokenSource? _playbackCts;
        private Task? _playbackTask;

        public event Func<bool, bool, Task>? PlaybackFinished;
        public bool IsPlaying { get; private set; }

        public VoiceManager(DiscordClient client)
        {
            _client = client;
            if (_client.GetVoiceNext() == null)
            {
                throw new InvalidOperationException("VoiceNext is not enabled for this client.");
            }
        }

        public static DiscordChannel? GetVoiceChannel(DiscordVoiceState? voiceState)
        {
            return voiceState?.Channel != null && voiceState.Channel.Type == ChannelType.Voice
                ? voiceState.Channel
                : null;
        }

        public enum JoinVoiceChannelResponseCode
        {
            Success,
            AlreadyConnected,
            UnknownError
        }

        public class JoinVoiceResponse
        {
            public JoinVoiceChannelResponseCode Code { get; set; }
            public string? VoiceChannelName { get; set; }
        }

        public async Task<JoinVoiceResponse> JoinVoiceChannelAsync(DiscordChannel voiceChannel)
        {
            try
            {
                var vnext = _client.GetVoiceNext();
                _vnc = vnext.GetConnection(voiceChannel.Guild);

                if (_vnc != null)
                {
                    return new JoinVoiceResponse { Code = JoinVoiceChannelResponseCode.AlreadyConnected, VoiceChannelName = _vnc.TargetChannel.Name };
                }

                _logger.Information("Trying to connect to voice channel {VoiceChannelName}", voiceChannel.Name);
                _vnc = await vnext.ConnectAsync(voiceChannel).ConfigureAwait(false);
                _logger.Information("Connected to voice channel {VoiceChannelName}", voiceChannel.Name);

                return new JoinVoiceResponse { Code = JoinVoiceChannelResponseCode.Success, VoiceChannelName = voiceChannel.Name };
            }
            catch (Exception e)
            {
                _logger.Error(e, "An unknown error occurred while trying to join the voice channel {VoiceChannelName}", voiceChannel.Name);
                return new JoinVoiceResponse { Code = JoinVoiceChannelResponseCode.UnknownError };
            }
        }

        public Task PlayAudioAsync(string path, int volume)
        {
            if (_vnc == null)
                throw new InvalidOperationException("Not connected to a voice channel.");

            if (IsPlaying)
                return Task.CompletedTask;

            _playbackCts = new CancellationTokenSource();
            _playbackTask = Task.Run(async () =>
            {
                Stream? fileStream = null;
                try
                {
                    await _vnc.SendSpeakingAsync(true).ConfigureAwait(false);
                    IsPlaying = true;
                    _playbackStartTime = DateTime.UtcNow;

                    fileStream = FFmpeg.GetFileStream(path, volume);
                    if (fileStream == null)
                    {
                        throw new InvalidOperationException("FFmpeg failed to create a stream.");
                    }

                    _logger.Information("Playing audio from {Path}", path);
                    var transmitSink = _vnc.GetTransmitSink();
                    await fileStream.CopyToAsync(transmitSink, _playbackCts.Token).ConfigureAwait(false);
                    await transmitSink.FlushAsync(_playbackCts.Token).ConfigureAwait(false);
                    await _vnc.WaitForPlaybackFinishAsync().ConfigureAwait(false);

                    if (PlaybackFinished != null && !_playbackCts.IsCancellationRequested)
                    {
                        await PlaybackFinished.Invoke(false, false).ConfigureAwait(false);
                    }
                }
                catch (OperationCanceledException)
                {
                    _logger.Information("Audio playback was cancelled.");
                }
                catch (Exception ex)
                {
                    _logger.Error(ex, "An error occurred during audio playback.");
                }
                finally
                {
                    fileStream?.Dispose();
                    IsPlaying = false;
                    if (_vnc?.IsConnected == true)
                    {
                        await _vnc.SendSpeakingAsync(false).ConfigureAwait(false);
                    }
                }
            });
            return _playbackTask;
        }

        public async Task StopAudioAsync(bool isForceLeave = false)
        {
            if (!IsPlaying || _playbackCts == null || _playbackTask == null)
                return;

            _playbackCts.Cancel();
            await _playbackTask;
            _playbackTask = null;

            if (PlaybackFinished != null)
            {
                await PlaybackFinished.Invoke(true, isForceLeave);
            }

            _logger.Information("Stopped audio playback.");
        }

        public TimeSpan GetPlaybackDuration()
        {
            return IsPlaying ? DateTime.UtcNow - _playbackStartTime : TimeSpan.Zero;
        }

        public async Task LeaveVoiceChannelAsync()
        {
            if (_vnc == null)
                return;

            if (IsPlaying)
            {
                await StopAudioAsync(isForceLeave: true);
            }

            _vnc.Disconnect();
            _vnc = null;
        }

        public bool IsConnectedToVoice()
        {
            return _vnc != null && _vnc.IsConnected;
        }

        public async ValueTask DisposeAsync()
        {
            if (_vnc != null)
            {
                await LeaveVoiceChannelAsync();
            }
            _playbackCts?.Dispose();
            GC.SuppressFinalize(this);
        }
    }
}