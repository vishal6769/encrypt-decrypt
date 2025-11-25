// dec.cpp
#include <iostream>
#include <vector>
#include <string>
#include <cstdint>
#include <cstdio>
#include <algorithm>

#include "des.cpp"   // your DES implementation (or include header)

#define STB_IMAGE_IMPLEMENTATION
#include "stb_image.h"

#define STB_IMAGE_WRITE_IMPLEMENTATION
#include "stb_image_write.h"

// macOS pick-file (same helper you used)
std::string pickFile() {
    std::string tempFile = "/tmp/filedialog_result.txt";
    std::string command =
        "osascript -e 'set theFile to choose file' "
        "-e 'do shell script \"echo \" & quoted form of POSIX path of theFile & \" > " + tempFile + "\"'";
    system(command.c_str());
    FILE* fp = fopen(tempFile.c_str(), "r");
    if (!fp) return "";
    char buffer[1024];
    if (!fgets(buffer, sizeof(buffer), fp)) {
        fclose(fp);
        return "";
    }
    fclose(fp);
    // remove trailing newline if present
    std::string s(buffer);
    if (!s.empty() && s.back() == '\n') s.pop_back();
    return s;
}

int main() {
    std::string file = pickFile();
    if (file.empty()) {
        std::cerr << "No file selected\n";
        return 1;
    }

    const char* encImg = file.c_str();
    const char* decImg = "img_dec_out.png";

    int width = 0, height = 0, channels = 0;

    // Load encrypted PNG (RGB)
    unsigned char* data = stbi_load(encImg, &width, &height, &channels, 3);
    if (!data) {
        std::cerr << "Failed to load encrypted PNG\n";
        return 1;
    }

    int size = width * height * 3;
    std::cout << "Loaded encrypted image: " << width << "x" << height << " channels=" << 3 << " bytes=" << size << "\n";

    // Read key (must match encryption key)
    std::string keyStr;
    std::cout << "Enter decryption key (will be padded/truncated to 8 bytes): ";
    std::cin >> keyStr;
    // ensure exactly 8 bytes
    if (keyStr.size() < 8) keyStr.append(8 - keyStr.size(), '0');
    if (keyStr.size() > 8) keyStr = keyStr.substr(0,8);

    DES des; // default ctor as in your des.cpp
    // convert loaded pixels to std::string (ciphertext)
    std::string ciphertext(reinterpret_cast<char*>(data), static_cast<size_t>(size));

    // free original pixel buffer
    stbi_image_free(data);

    // decrypt (we use the variant that derives plaintext length from ciphertext size)
    std::string plaintext;
    try {
        plaintext = des.CBC_CTS_decrypt(ciphertext, keyStr);
    } catch (const std::exception &e) {
        std::cerr << "Decryption error: " << e.what() << "\n";
        return 1;
    }

    if (plaintext.size() != static_cast<size_t>(size)) {
        std::cerr << "Warning: decrypted size (" << plaintext.size()
                  << ") differs from expected image bytes (" << size << ")\n";
        // still attempt to write using the available bytes (pad/truncate to fit)
    }

    // Prepare output buffer (RGB)
    std::vector<unsigned char> out;
    out.resize(size);
    // copy decrypted bytes; if plaintext smaller than size, pad with zeros
    size_t copyLen = std::min<size_t>(plaintext.size(), out.size());
    std::copy(plaintext.begin(), plaintext.begin() + copyLen, out.begin());
    if (copyLen < out.size()) std::fill(out.begin() + copyLen, out.end(), 0);

    // Save restored pixels to PNG
    if (!stbi_write_png(decImg, width, height, 3, out.data(), width * 3)) {
        std::cerr << "Failed to write decrypted PNG\n";
        return 1;
    }

    std::cout << "Decryption complete! Output: " << decImg << "\n";
    return 0;
}
