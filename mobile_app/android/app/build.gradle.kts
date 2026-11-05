import java.util.Properties
import java.io.FileInputStream

plugins {
    id("com.android.application")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

val keystoreProperties = Properties()
val keystorePropertiesFile = rootProject.file("key.properties")
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(FileInputStream(keystorePropertiesFile))
}

android {
    namespace = "in.digitalgrowthstudio.ashtekar_collection"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    signingConfigs {
        create("release") {
            val keyFile = keystoreProperties.getProperty("storeFile")
            val targetKey = if (keyFile != null && rootProject.file(keyFile).exists()) {
                rootProject.file(keyFile)
            } else if (keyFile != null && file(keyFile).exists()) {
                file(keyFile)
            } else null

            if (targetKey != null) {
                keyAlias = keystoreProperties.getProperty("keyAlias")
                keyPassword = keystoreProperties.getProperty("keyPassword")
                storeFile = targetKey
                storePassword = keystoreProperties.getProperty("storePassword")
            }
        }
    }

    defaultConfig {
        // Unique Application ID for Ashtekar Collection mobile app
        applicationId = "in.digitalgrowthstudio.ashtekar_collection"
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    buildTypes {
        release {
            val relConfig = signingConfigs.findByName("release")
            if (relConfig?.storeFile != null) {
                signingConfig = relConfig
            } else {
                signingConfig = signingConfigs.getByName("debug")
            }
        }
    }

    lint {
        checkReleaseBuilds = false
        abortOnError = false
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}

tasks.matching { it.name.startsWith("lintVital") }.configureEach {
    enabled = false
}

tasks.matching { it.name.contains("AarMetadata") }.configureEach {
    enabled = false
}

configurations.all {
    resolutionStrategy {
        force("androidx.browser:browser:1.8.0")
        force("androidx.core:core:1.13.1")
        force("androidx.core:core-ktx:1.13.1")
    }
}
