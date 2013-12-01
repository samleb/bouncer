task :default => [:dist, :minify]

desc "Builds the distribution"
task :dist do
  require 'sprockets'
  require 'fileutils'
  require './preprocessor'
  
  secretary = Sprockets::Secretary.new(source_files: ['src/bouncer.js'])
  output = Bouncer::Preprocessor.preprocess(secretary.concatenation.to_s)
  
  FileUtils.mkdir_p('dist')
  write('dist/bouncer.js', output)
end

desc "Minifies the distribution with UglifyJS"
task :minify do
  require 'uglifier'
  
  source = File.read('dist/bouncer.js')
  output = Uglifier.compile(source, compress: { unsafe: true })
  
  write('dist/bouncer.min.js', output)
end

def write(path, contents)
  File.open(path, 'w') { |f| f << contents }
end