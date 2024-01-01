import fs from 'fs';

const getCacheDirName = () => {
	const cacheDir: string = `${process.cwd()}/cache`;
	if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);

	return cacheDir;
};

const getCacheFileName = (id: string) => {
	const cacheDir = getCacheDirName();
	const cacheFile: string = `${cacheDir}/${id}.mp3`;

	return cacheFile;
};

export { getCacheDirName, getCacheFileName };
