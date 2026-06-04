"""
下载 HDR 环境贴图用于 Three.js 场景
来源：Poly Haven (CC0 协议)
输出：D:\\workspace\\emergence-world\\public\\textures\\env.hdr
"""

import urllib.request
import os

OUT_DIR = r"D:\workspace\emergence-world\public\textures"
OUT_FILE = os.path.join(OUT_DIR, "env.hdr")

# 使用较小体积的 HDR (1K 版本方便测试)
# Poly Haven CDN 上的 venice_sunset_1k.hdr
URL = "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/venice_sunset_1k.hdr"

def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    print(f"下载中: {URL}")
    try:
        urllib.request.urlretrieve(URL, OUT_FILE)
        size_kb = os.path.getsize(OUT_FILE) / 1024
        print(f"✅ 下载完成: {OUT_FILE} ({size_kb:.0f} KB)")
    except Exception as e:
        print(f"❌ 下载失败: {e}")
        # 尝试备用链接
        backup_urls = [
            "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_03_1k.hdr",
        ]
        for url in backup_urls:
            try:
                print(f"尝试备用: {url}")
                urllib.request.urlretrieve(url, OUT_FILE)
                size_kb = os.path.getsize(OUT_FILE) / 1024
                print(f"✅ 下载完成: {OUT_FILE} ({size_kb:.0f} KB)")
                return
            except Exception as e2:
                print(f"❌ 备用也失败: {e2}")
        print("所有下载尝试均失败，将使用 drei 内置环境预设")

if __name__ == "__main__":
    main()
