package MetaKGS::Web::Text::Xslate::Functions;
use strict;
use warnings;
use Exporter qw/import/;
use File::Spec;
use MetaKGS;

our @EXPORT = qw(
    c
    uri_with
    uri_for
    static_file
);

our %StaticFile;

sub c        { MetaKGS->context }
sub uri_with { MetaKGS->context->request->uri_with(@_) }
sub uri_for  { MetaKGS->context->uri_for(@_) }

sub static_file {
    my $file = shift;
    my $c = MetaKGS->context;

    unless ( exists $StaticFile{$file} ) {
        my $fullpath = File::Spec->catfile( $c->base_dir, $file );
        $StaticFile{$file} = ( stat $fullpath )[9];
    }

    $c->uri_for($file, {
        t => $StaticFile{$file} || 0,
    });
}

1;
