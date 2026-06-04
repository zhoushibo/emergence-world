"""测试 blender-mcp 的工具列表"""
import subprocess
import json
import sys

# 启动 blender-mcp 进程
proc = subprocess.Popen(
    ["uvx", "blender-mcp"],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    shell=True,
)

# 发送 tools/list 请求
request = json.dumps({"jsonrpc": "2.0", "id": 1, "method": "tools/list"})
stdout, stderr = proc.communicate(input=request, timeout=10)

print("=== STDOUT ===")
print(stdout)
print("=== STDERR ===")
print(stderr)
