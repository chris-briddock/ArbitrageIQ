FROM fedora:44

# Install base dependencies
RUN dnf -y update && \
    dnf -y install \
    curl \
    wget \
    git \
    unzip \
    ca-certificates \
    make \
    gcc \
    gcc-c++ \
    openssl-devel \
    zlib-devel \
    libpq-devel \
    tar \
    which \
    jq \
    sudo
RUN dnf clean all

# Install Docker CLI (official scripted install)
RUN curl -fsSL https://get.docker.com -o get-docker.sh && \
    sh get-docker.sh --no-install-recommends --skip-engine --skip-compose && \
    rm get-docker.sh

# Install Oracle Java (latest LTS, e.g., 21)
RUN curl -fsSL https://download.oracle.com/java/21/latest/jdk-21_linux-x64_bin.tar.gz -o /tmp/jdk.tar.gz && \
    mkdir -p /opt/oracle && \
    tar -xzf /tmp/jdk.tar.gz -C /opt/oracle && \
    rm /tmp/jdk.tar.gz && \
    JDK_DIR=$(ls -d /opt/oracle/jdk-* | head -n1) && \
    ln -s "$JDK_DIR" /opt/oracle/jdk
ENV JAVA_HOME=/opt/oracle/jdk
ENV PATH="${JAVA_HOME}/bin:${PATH}"

RUN dnf install -y maven

# Install Oracle PHP (latest stable)
# Add Remi's RPM repository and install PHP 8.4
RUN dnf -y install dnf-plugins-core && \
    dnf -y install https://rpms.remirepo.net/fedora/remi-release-$(rpm -E %fedora).rpm && \
    dnf module reset php -y && \
    dnf module enable php:remi-8.4 -y && \
    dnf -y install php && \
    dnf clean all

# Install Composer
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

# Install Go (latest stable)
ENV GO_VERSION=1.22.0
RUN wget https://go.dev/dl/go${GO_VERSION}.linux-amd64.tar.gz && \
    tar -C /usr/local -xzf go${GO_VERSION}.linux-amd64.tar.gz && \
    rm go${GO_VERSION}.linux-amd64.tar.gz
ENV PATH="/usr/local/go/bin:${PATH}"

RUN mkdir -p /workspaces
# Set working directory
WORKDIR /workspaces

# Create user c with UID 1000 and GID 1000 (adjust as needed)

# Create docker group if it doesn't exist, then add c to docker and wheel group
RUN groupdel -f docker || true && \
    groupadd -g 977 docker && \
    useradd -m -u 1000 -s /bin/bash c && \
    usermod -aG docker c && \
    usermod -aG wheel c && \
    echo "c ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/c && \
    chmod 0440 /etc/sudoers.d/c

USER c

# Install Rust (via rustup)
RUN curl https://sh.rustup.rs -sSf | sh -s -- -y && \
    . $HOME/.cargo/env && \
    rustup component add rust-src
ENV PATH="/home/c/.cargo/bin:${PATH}"

ENV NVM_DIR="/home/c/.nvm"
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash && \
    export NVM_DIR="$NVM_DIR" && \
    [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && \
    nvm install --lts && \
    nvm use --lts && \
    npm install -g typescript && \
    npm install -g bun && \
    nvm cache clear && \
    NODE_VERSION=$(nvm current) && \
    ln -s "/home/c/.nvm/versions/node/${NODE_VERSION}" /home/c/.nvm/versions/node/current
ENV PATH="/home/c/.nvm/versions/node/current/bin:/home/c/.cargo/bin:/home/c/.dotnet:${PATH}"

# Install .NET SDKs: LTS + STS
RUN curl -sSL https://dot.net/v1/dotnet-install.sh -o /tmp/dotnet-install.sh && \
    chmod +x /tmp/dotnet-install.sh

# Install latest .NET LTS SDK
RUN /tmp/dotnet-install.sh --channel LTS --install-dir /home/c/.dotnet

# Install latest .NET STS SDK
RUN /tmp/dotnet-install.sh --channel STS --install-dir /home/c/.dotnet

# Clean up
RUN rm /tmp/dotnet-install.sh

ENV DOTNET_ROOT="/home/c/.dotnet"
ENV PATH="/home/c/.dotnet:${PATH}"

# Print versions for verification
RUN dotnet --list-sdks && \
    node --version && \
    npm --version && \
    tsc --version && \
    php --version && \
    composer --version && \
    go version && \
    java -version

# Install powershell
RUN dotnet tool install --global PowerShell

CMD ["bash"]