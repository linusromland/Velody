
using Serilog;
using Velody.MongoDBIntegration.Repositories;

namespace Velody.Utils
{
    internal class Directory
    {
        private static readonly ILogger _logger = Logger.CreateLogger("Directory");

        public static string GetCachePath(string path)
        {
            string fullPath = System.IO.Path.Combine(System.IO.Directory.GetCurrentDirectory(), "cache", path);
            CreateDirectoryIfNotExists(fullPath);
            return fullPath;
        }

        public static void CreateDirectoryIfNotExists(string path)
        {
            if (!System.IO.Directory.Exists(path))
            {
                System.IO.Directory.CreateDirectory(path);
            }
        }

        public static void DeleteOldFiles(string path, int maxSizeInGB, CacheRepository? cacheRepository)
        {
            _logger.Information("Checking size of files in {Path}", path);
            if (System.IO.Directory.Exists(path))
            {
                System.IO.DirectoryInfo directoryInfo = new(path);
                System.IO.FileInfo[] files = directoryInfo.GetFiles();
                long totalSize = 0;
                foreach (System.IO.FileInfo file in files)
                {
                    totalSize += file.Length;
                }
                _logger.Information("Total size of files in {Path}: {TotalSize}", path, totalSize);

                if (totalSize > maxSizeInGB * 1024 * 1024 * 1024)
                {
                    _logger.Information("Deleting old files in {Path}", path);
                    System.Array.Sort(files, (x, y) => x.CreationTime.CompareTo(y.CreationTime));
                    foreach (System.IO.FileInfo file in files)
                    {
                        if (cacheRepository != null)
                        {
                            _ = cacheRepository.RemoveCache(file.Name);
                        }
                        _logger.Warning("Deleting file {FileName}", file.Name);
                        totalSize -= file.Length;
                        file.Delete();

                        if (totalSize <= maxSizeInGB * 1024 * 1024 * 1024)
                        {
                            _logger.Information("Deleted enough files, stopping for path {Path}", path);
                            break;
                        }
                    }
                }
            }
            else
            {
                _logger.Warning("Directory {Path} does not exist", path);
            }
        }
    }
}
