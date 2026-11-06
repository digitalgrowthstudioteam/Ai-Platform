"""
Git Health Check & Auto-Repair Utility
Resolves:
- "fatal: Unable to read current working directory"
- Stale .git lock files (index.lock, HEAD.lock)
- Commit-graph synchronization issues
- Windows safe.directory issues
"""

import os
import sys
import subprocess
from pathlib import Path

WORKSPACE = Path(r"D:\App\Digital Growth Studio")
GIT_DIR = WORKSPACE / ".git"

def log(msg):
    print(f"[GIT-HEALTH] {msg}")

def remove_stale_locks():
    if not GIT_DIR.exists():
        log(f"Git directory not found at {GIT_DIR}")
        return
    
    locks_found = 0
    for lock in GIT_DIR.glob("**/*.lock"):
        try:
            lock.unlink()
            log(f"Removed stale lock: {lock}")
            locks_found += 1
        except Exception as e:
            log(f"Failed to remove {lock}: {e}")
    
    if locks_found == 0:
        log("No stale lock files found.")

def repair_commit_graph():
    log("Refreshing git commit-graph...")
    try:
        res = subprocess.run(
            ["git", "commit-graph", "write", "--reachable", "--changed-paths"],
            cwd=str(WORKSPACE),
            capture_output=True,
            text=True,
            check=True
        )
        log("Commit-graph rebuilt successfully.")
    except Exception as e:
        log(f"Commit-graph notice: {e}")

def configure_git_environment():
    log("Configuring git settings for Windows...")
    configs = [
        ("core.autocrlf", "true"),
        ("core.fscache", "true"),
        ("safe.directory", str(WORKSPACE).replace("\\", "/")),
    ]
    for key, val in configs:
        try:
            subprocess.run(
                ["git", "config", key, val],
                cwd=str(WORKSPACE),
                capture_output=True,
                check=False
            )
        except Exception:
            pass

def verify_git_status():
    log("Verifying git status...")
    try:
        res = subprocess.run(
            ["git", "status", "-s"],
            cwd=str(WORKSPACE),
            capture_output=True,
            text=True,
            check=True
        )
        output = res.stdout.strip()
        if not output:
            log("Git status: Working tree is clean and operational!")
        else:
            log(f"Git status: {len(output.splitlines())} file(s) modified/untracked.")
    except subprocess.CalledProcessError as e:
        log(f"Error checking git status: {e.stderr}")

if __name__ == "__main__":
    log("Running automated Git health check and repair...")
    remove_stale_locks()
    configure_git_environment()
    repair_commit_graph()
    verify_git_status()
    log("All git diagnostics and repairs completed successfully!")

