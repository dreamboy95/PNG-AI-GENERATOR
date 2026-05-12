import { removeBackground, Config } from '@imgly/background-removal';

export async function removeBackgroundLocal(imageSource: string | File): Promise<string> {
  const config: Config = {
    publicPath: 'https://unpkg.com/@imgly/background-removal@1.7.0/dist/',
    debug: false,
    progress: (key, current, total) => {
      console.log(`Downloading ${key}: ${current} of ${total}`);
    }
  };
  
  const blob = await removeBackground(imageSource, config);
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.result) resolve(reader.result.toString());
      else reject(new Error("Failed to read blob as Base64."));
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
