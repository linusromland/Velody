namespace Velody.Presenters.TTS
{
    public interface ITTSProvider
    {
        string ServiceName { get; }
        Task DownloadTTSAsync(string text, string filePath);
    }
}