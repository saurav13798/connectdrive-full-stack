# Getting started — setup for LLM experiments (Windows)

This workspace contains notebook examples and helper scripts for working with small-scale LLM experiments locally.

Quick steps (recommended)

1. Open PowerShell (recommended: run as normal user). Navigate to the workspace folder:

   cd "d:\\Adv Python\\practice_repo"

2. Run the setup helper to create a virtual environment and install packages:

   .\\setup_venv.ps1

3. Activate the environment in future sessions:

   . \\.venv\\Scripts\\Activate.ps1

Notes about PyTorch (important)

- Installing `torch` on Windows often requires selecting the correct wheel for your CUDA version.
- The helper script will by default install the CPU-only PyTorch wheel (recommended if you don't have an NVIDIA GPU or want the simplest setup).
- If you need CUDA-enabled PyTorch, answer `n` when prompted in the script and follow the official PyTorch install instructions at https://pytorch.org/get-started/locally/ to obtain the correct pip command for your CUDA version. Example (replace with the command from the website):

  python -m pip install --index-url https://download.pytorch.org/whl/cu118 torch torchvision torchaudio --extra-index-url https://pypi.org/simple

Jupyter / VS Code

- After activation, install the kernel so Jupyter/VS Code can use the venv interpreter (optional):

  python -m ipykernel install --user --name=practice_repo_venv --display-name "practice_repo (.venv)"

- Open the `LLMScrach.ipynb` or `Tokenizer.ipynb` with VS Code and pick the kernel named "practice_repo (.venv)".

Optional extras

- If you plan to use bitsandbytes or 8-bit optimizations, review their installation instructions carefully — Windows support may be limited and often requires specific builds.

If you'd like, I can:
- run the setup script here (I need permission to run shell commands in your environment), or
- create a runnable Python script that demonstrates tokenization end-to-end and a small unit test.
