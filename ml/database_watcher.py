import os
import time
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import logging
import subprocess
import sys
from pathlib import Path

logger = logging.getLogger(__name__)

class DatabaseChangeHandler(FileSystemEventHandler):
    """Handles database file changes and triggers ML service restart"""
    
    def __init__(self, ml_service_process=None, callback=None):
        self.ml_service_process = ml_service_process
        self.callback = callback
        self.last_modified = {}  # Track per-file modification times
        self.debounce_time = 3  # Increased debounce time to 3 seconds
        
    def on_modified(self, event):
        if event.is_directory:
            return
            
        # Check if it's a database file we care about
        if event.src_path.endswith(('rental.db', 'dev.db')):
            current_time = time.time()
            file_path = event.src_path
            
            # Debounce rapid changes for this specific file
            if (file_path in self.last_modified and 
                current_time - self.last_modified[file_path] < self.debounce_time):
                return
                
            self.last_modified[file_path] = current_time
            
            logger.info(f"Database change detected: {file_path}")
            print(f"Database change detected: {os.path.basename(file_path)}")
            
            if self.callback:
                # Use threading to avoid blocking the file watcher
                import threading
                thread = threading.Thread(target=self.callback)
                thread.daemon = True
                thread.start()

class DatabaseWatcher:
    """Watches for database changes and manages ML service restart"""
    
    def __init__(self, db_paths, restart_callback=None):
        self.db_paths = db_paths if isinstance(db_paths, list) else [db_paths]
        self.restart_callback = restart_callback
        self.observers = []
        self.is_watching = False
        
    def start_watching(self):
        """Start watching database files for changes"""
        if self.is_watching:
            return
            
        logger.info("Starting database change monitoring...")
        
        for db_path in self.db_paths:
            if os.path.exists(db_path):
                directory = os.path.dirname(db_path)
                event_handler = DatabaseChangeHandler(callback=self.restart_callback)
                observer = Observer()
                observer.schedule(event_handler, directory, recursive=False)
                observer.start()
                self.observers.append(observer)
                
                logger.info(f"Watching: {db_path}")
                print(f"Watching for changes: {os.path.basename(db_path)}")
            else:
                logger.warning(f"Database file not found: {db_path}")
        
        self.is_watching = True
        
    def stop_watching(self):
        """Stop watching database files"""
        if not self.is_watching:
            return
            
        logger.info("Stopping database change monitoring...")
        
        for observer in self.observers:
            observer.stop()
            observer.join()
            
        self.observers.clear()
        self.is_watching = False
        
    def __enter__(self):
        self.start_watching()
        return self
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.stop_watching()

def get_database_paths():
    """Get all database file paths to monitor"""
    base_dir = Path(__file__).parent.parent
    
    paths = [
        base_dir / "backend" / "app" / "rental.db",
        base_dir / "database" / "rental.db",
        base_dir / "backend-node" / "prisma" / "dev.db"
    ]
    
    # Return existing paths
    return [str(path) for path in paths if path.exists()]

if __name__ == "__main__":
    # Test the database watcher
    def test_callback():
        print("Database change detected - ML service would restart!")
    
    db_paths = get_database_paths()
    print(f"Monitoring databases: {db_paths}")
    
    with DatabaseWatcher(db_paths, test_callback):
        try:
            print("Watching for database changes... (Press Ctrl+C to stop)")
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\nStopping watcher...")