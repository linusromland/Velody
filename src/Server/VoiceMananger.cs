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
    public class VoiceManager
    {
        private readonly ILogger _logger = Logger.CreateLogger("VoiceManager");
        private readonly DiscordClient _client;
        private VoiceNextConnection? _vnc;
        private DateTime _playbackStartTime;
        private bool _isPlaying;

        private Task? _playbackTask;
        private CancellationTokenSource? _cancellationTokenSource;

        public event Func<bool, bool, Task>? PlaybackFinished;

        public VoiceManager(DiscordClient client)
        {
            _client = client;
            var vnext = _client.GetVoiceNext();

            if (vnext == null)
            {
                throw new InvalidOperationException("VoiceNext is not enabled or registered for this client.");
            }
        }

        public static DiscordChannel? GetVoiceChannel(DiscordVoiceState? voiceState)
        {
            if (voiceState?.Channel is { Type: ChannelType.Voice } voiceChannel)
            {
                return voiceChannel;
            }
            return null;
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
                    _logger.Warning("Already connected to a voice channel in this guild.");
                    return new JoinVoiceResponse { Code = JoinVoiceChannelResponseCode.AlreadyConnected, VoiceChannelName = _vnc.TargetChannel.Name };
                }

                _logger.Information("Trying to connect to voice channel {VoiceChannelName}", voiceChannel.Name);
                _vnc = await vnext.ConnectAsync(voiceChannel); // This will now complete with correct intents.
                _logger.Information("Connected to voice channel {VoiceChannelName}", voiceChannel.Name);

                return new JoinVoiceResponse { Code = JoinVoiceChannelResponseCode.Success, VoiceChannelName = voiceChannel.Name };
            }
            catch (Exception e)
            {
                _logger.Error(e, "An unknown error occurred while trying to join the voice channel {VoiceChannelName}", voiceChannel.Name);
                return new JoinVoiceResponse { Code = JoinVoiceChannelResponseCode.UnknownError };
            }
        }

        public void PlayAudio(string path, int volume)
        {
            if (_vnc == null)
            {
                throw new InvalidOperationException("Not connected to a voice channel.");
            }

            if (_isPlaying)
            {
                _logger.Warning("Audio is already playing. Please stop the current audio first.");
                return;
            }

            _cancellationTokenSource = new CancellationTokenSource();
            _playbackTask = Task.Run(() => PlayAudioInternal(path, volume, _cancellationTokenSource.Token));
        }

        private async Task PlayAudioInternal(string path, int volume, CancellationToken cancellationToken)
        {
            if (_vnc == null) return; // Connection might have been dropped.

            try
            {
                await _vnc.SendSpeakingAsync(true);

                using (var fileStream = FFmpeg.GetFileStream(path, volume))
                {
                    if (fileStream == null)
                    {
                        throw new InvalidOperationException("Failed to get file stream from FFmpeg.");
                    }

                    _playbackStartTime = DateTime.UtcNow;
                    _isPlaying = true;
                    _logger.Information("Playing audio from {Path}", path);

                    var transmit = _vnc.GetTransmitSink();
                    await fileStream.CopyToAsync(transmit, cancellationToken);
                    await transmit.FlushAsync(cancellationToken);
                }

                if (PlaybackFinished != null)
                {
                    await PlaybackFinished.Invoke(false, false);
                }
                _logger.Information("Finished playing audio from {Path}", path);
            }
            catch (OperationCanceledException)
            {
                // This is expected when we cancel the token, so we don't log it as an error.
                _logger.Information("Audio playback was cancelled.");
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "An error occurred during audio playback.");
            }
            finally
            {
                _isPlaying = false;
                if (_vnc != null && !_vnc.IsDisposed)
                {
                    await _vnc.SendSpeakingAsync(false);
                }
            }
        }

        public async Task StopAudio(bool shouldInvokeFinished = true, bool isForceLeave = false)
        {
            if (_cancellationTokenSource == null || _playbackTask == null) return;

            _cancellationTokenSource.Cancel();

            await _playbackTask;

            _cancellationTokenSource.Dispose();
            _cancellationTokenSource = null;
            _playbackTask = null;

            if (shouldInvokeFinished && PlaybackFinished != null)
            {
                await PlaybackFinished.Invoke(true, isForceLeave);
            }

            _logger.Information("Stopped audio playback.");
        }

        public TimeSpan GetPlaybackDuration()
        {
            return _isPlaying ? DateTime.UtcNow - _playbackStartTime : TimeSpan.Zero;
        }

        public async void LeaveVoiceChannel()
        {
            if (_vnc == null) return;

            // Stop any ongoing playback before disconnecting.
            if (_isPlaying)
            {
                await StopAudio(false, true);
            }

            _vnc.Disconnect();
            _vnc = null;
        }

        public bool IsConnectedToVoice()
        {
            return _vnc != null;
        }
    }
}